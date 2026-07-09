// Background Processor - Handles processing even when tab is hidden

import type { UploadEntity, UploadLeadEntity, BackgroundTask } from './types';
import { supabase } from '@/integrations/supabase/client';

type ProcessorCallback = (event: ProcessorEvent) => void;

interface ProcessorEvent {
  type: 'progress' | 'lead-complete' | 'upload-complete' | 'error' | 'paused' | 'resumed';
  uploadSlug: string;
  data?: any;
}

class BackgroundProcessor {
  private activeTasks: Map<string, BackgroundTask> = new Map();
  private processingQueue: Map<string, NodeJS.Timeout | number> = new Map();
  private callbacks: Set<ProcessorCallback> = new Set();
  private isPageVisible: boolean = true;

  constructor() {
    // Track visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Use Service Worker for true background processing if available
    this.initializeServiceWorker();
  }

  private handleVisibilityChange = () => {
    this.isPageVisible = !document.hidden;
    
    // Continue processing even when hidden
  };

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Service worker for background sync will be added later
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  subscribe(callback: ProcessorCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private emit(event: ProcessorEvent) {
    this.callbacks.forEach(cb => cb(event));
  }

  // Start processing an upload
  async startUpload(upload: UploadEntity, leads: UploadLeadEntity[]): Promise<void> {
    const task: BackgroundTask = {
      id: upload.slug,
      type: 'upload',
      entitySlug: upload.slug,
      status: 'running',
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    this.activeTasks.set(upload.slug, task);
    await this.processLeads(upload, leads);
  }

  private async processLeads(upload: UploadEntity, leads: UploadLeadEntity[]): Promise<void> {
    const delayMs = Math.ceil(60000 / (upload.leadsPerMinute || 5));
    let currentIndex = upload.currentLeadIndex || 0;

    const processNext = async () => {
      // Check if paused or cancelled
      const task = this.activeTasks.get(upload.slug);
      if (!task || task.status !== 'running') {
        return;
      }

      // Check if upload is paused in DB
      const { data: batchData } = await supabase
        .from('upload_batches')
        .select('is_paused, is_cancelled')
        .eq('id', upload.id)
        .maybeSingle();

      if (batchData?.is_cancelled) {
        this.cancelUpload(upload.slug);
        return;
      }

      if (batchData?.is_paused) {
        this.pauseUpload(upload.slug);
        return;
      }

      if (currentIndex >= leads.length) {
        // All leads processed
        await this.completeUpload(upload);
        return;
      }

      const lead = leads[currentIndex];
      
      try {
        // Process the lead via edge function
        const result = await this.processLead(upload, lead);
        
        // Update lead status
        await supabase
          .from('push_leads')
          .update({
            status: result.success ? 'success' : 'failed',
            api_response: result.response,
            processed_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        // Update batch counts
        if (result.success) {
          await supabase.rpc('increment_batch_success', { batch_uuid: upload.id });
        } else {
          await supabase.rpc('increment_batch_fail', { batch_uuid: upload.id });
        }

        // Update progress
        await supabase
          .from('upload_batches')
          .update({
            current_lead_index: currentIndex + 1,
            processed_count: currentIndex + 1,
          })
          .eq('id', upload.id);

        this.emit({
          type: 'lead-complete',
          uploadSlug: upload.slug,
          data: { index: currentIndex, success: result.success },
        });

        // Update task progress
        const progress = Math.round(((currentIndex + 1) / leads.length) * 100);
        if (task) {
          task.progress = progress;
        }
        this.emit({ type: 'progress', uploadSlug: upload.slug, data: { progress } });

      } catch (error) {
        console.error('Error processing lead:', error);
        this.emit({
          type: 'error',
          uploadSlug: upload.slug,
          data: { index: currentIndex, error: String(error) },
        });
      }

      currentIndex++;

      // Schedule next lead with rate limiting
      const timeoutId = setTimeout(processNext, delayMs);
      this.processingQueue.set(upload.slug, timeoutId as unknown as number);
    };

    // Start processing
    processNext();
  }

  private async processLead(
    upload: UploadEntity, 
    lead: UploadLeadEntity
  ): Promise<{ success: boolean; response: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-lead', {
        body: {
          leadId: lead.id,
          universityId: upload.universityId,
        },
      });

      if (error) {
        return { success: false, response: error.message };
      }

      return {
        success: data?.success ?? false,
        response: JSON.stringify(data?.response || data),
      };
    } catch (error) {
      return { success: false, response: String(error) };
    }
  }

  async pauseUpload(uploadSlug: string): Promise<void> {
    const task = this.activeTasks.get(uploadSlug);
    if (task) {
      task.status = 'pending';
    }

    // Clear scheduled processing
    const timeoutId = this.processingQueue.get(uploadSlug);
    if (timeoutId) {
      clearTimeout(timeoutId as unknown as NodeJS.Timeout);
      this.processingQueue.delete(uploadSlug);
    }

    this.emit({ type: 'paused', uploadSlug });
  }

  async resumeUpload(upload: UploadEntity, leads: UploadLeadEntity[]): Promise<void> {
    const task = this.activeTasks.get(upload.slug);
    if (task) {
      task.status = 'running';
    }

    this.emit({ type: 'resumed', uploadSlug: upload.slug });
    await this.processLeads(upload, leads);
  }

  async cancelUpload(uploadSlug: string): Promise<void> {
    const task = this.activeTasks.get(uploadSlug);
    if (task) {
      task.status = 'failed';
      task.error = 'Cancelled by user';
    }

    // Clear scheduled processing
    const timeoutId = this.processingQueue.get(uploadSlug);
    if (timeoutId) {
      clearTimeout(timeoutId as unknown as NodeJS.Timeout);
      this.processingQueue.delete(uploadSlug);
    }

    this.activeTasks.delete(uploadSlug);
  }

  private async completeUpload(upload: UploadEntity): Promise<void> {
    const task = this.activeTasks.get(upload.slug);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.progress = 100;
    }

    await supabase
      .from('upload_batches')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', upload.id);

    this.emit({ type: 'upload-complete', uploadSlug: upload.slug });
    this.activeTasks.delete(upload.slug);
    this.processingQueue.delete(upload.slug);
  }

  getActiveTask(uploadSlug: string): BackgroundTask | undefined {
    return this.activeTasks.get(uploadSlug);
  }

  getAllActiveTasks(): BackgroundTask[] {
    return Array.from(this.activeTasks.values());
  }

  isProcessing(uploadSlug: string): boolean {
    return this.activeTasks.has(uploadSlug);
  }

  cleanup() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // Clear all timeouts
    this.processingQueue.forEach(timeoutId => {
      clearTimeout(timeoutId as unknown as NodeJS.Timeout);
    });
    this.processingQueue.clear();
    this.activeTasks.clear();
  }
}

export const backgroundProcessor = new BackgroundProcessor();
