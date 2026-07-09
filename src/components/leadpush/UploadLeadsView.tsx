import { memo, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadLeadsTab } from '@/components/upload/UploadLeadsTab';
import { QueueMonitor } from '@/components/upload/QueueMonitor';
import { DataRetentionNotice } from '@/components/ui/DataRetentionNotice';
import { appCache } from '@/hooks/useAppCache';

interface UploadLeadsViewProps {
  universities: any[];
  selectedUniversity: any | null;
  onSelectUniversity: (uni: any) => void;
}

// Create slug from university name
const toSlug = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

// Encode filename for URL (handle special chars like dots)
const encodeFilename = (filename: string): string => {
  return encodeURIComponent(filename);
};

// Decode filename from URL
const decodeFilename = (encoded: string): string => {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

// Valid processing states for URL
const PROCESSING_STATES = ['processing', 'paused', 'complete', 'idle'] as const;
type ProcessingState = typeof PROCESSING_STATES[number];

function isProcessingState(str: string): str is ProcessingState {
  return PROCESSING_STATES.includes(str as ProcessingState);
}

export function UploadLeadsView({ universities, selectedUniversity, onSelectUniversity }: UploadLeadsViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialized = useRef(false);

  // Parse the hierarchical slug from URL
  const { universitySlug, fileName, processingState } = useMemo(() => {
    const fullPath = location.pathname;
    const basePath = '/admin/lead-push/upload';
    
    let remaining = '';
    if (fullPath.startsWith(basePath)) {
      remaining = fullPath.slice(basePath.length + 1);
    }
    
    const parts = remaining ? remaining.split('/').filter(Boolean) : [];
    const uniSlug = parts[0] || null;
    
    // Check if second part is a filename (not a processing state)
    let file: string | null = null;
    let procState: ProcessingState = 'idle';
    
    if (parts[1]) {
      if (isProcessingState(parts[1])) {
        // /lpu/processing
        procState = parts[1];
      } else {
        // /lpu/filename.csv
        file = decodeFilename(parts[1]);
        // Check for processing state after filename
        if (parts[2] && isProcessingState(parts[2])) {
          procState = parts[2];
        }
      }
    }
    
    return {
      universitySlug: uniSlug,
      fileName: file,
      processingState: procState,
    };
  }, [location.pathname]);

  // Restore selected university from cache or URL on mount
  useEffect(() => {
    if (universities.length === 0 || isInitialized.current) return;

    const cachedSlug = appCache.uploadSelectedUniversity;
    const targetSlug = universitySlug || cachedSlug;

    if (targetSlug) {
      const uniFromSlug = universities.find(
        u => toSlug(u.name) === targetSlug || u.slug === targetSlug
      );
      
      if (uniFromSlug) {
        if (!selectedUniversity || selectedUniversity.id !== uniFromSlug.id) {
          onSelectUniversity(uniFromSlug);
        }
        
        if (!universitySlug && cachedSlug) {
          navigate(`/admin/lead-push/upload/${targetSlug}`, { replace: true });
        }
      }
    }
    
    isInitialized.current = true;
  }, [universities, universitySlug, selectedUniversity, onSelectUniversity, navigate]);

  // Handle university selection with URL update
  const handleSelectUniversity = useCallback((uni: any) => {
    const slug = uni.slug || toSlug(uni.name);
    appCache.setUploadSelectedUniversity(slug);
    onSelectUniversity(uni);
    navigate(`/admin/lead-push/upload/${slug}`, { replace: true });
  }, [onSelectUniversity, navigate]);

  // Update URL when file is uploaded
  const handleFileUpload = useCallback((filename: string) => {
    if (!selectedUniversity) return;
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    const encodedFile = encodeFilename(filename);
    
    navigate(`/admin/lead-push/upload/${uniSlug}/${encodedFile}`, { replace: true });
  }, [selectedUniversity, navigate]);

  // Update URL with processing state
  const handleProcessingStateChange = useCallback((newState: ProcessingState) => {
    if (!selectedUniversity) return;
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    let path = `/admin/lead-push/upload/${uniSlug}`;
    
    if (fileName) {
      path += `/${encodeFilename(fileName)}`;
    }
    
    // Only add processing state if not idle
    if (newState !== 'idle') {
      path += `/${newState}`;
    }

    if (path === location.pathname) return;
    
    navigate(path, { replace: true });
  }, [selectedUniversity, fileName, location.pathname, navigate]);

  // Navigate up one level
  const navigateUp = useCallback(() => {
    if (!selectedUniversity) {
      navigate('/admin/lead-push');
      return;
    }
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    
    if (processingState !== 'idle') {
      // Remove processing state, keep filename
      if (fileName) {
        navigate(`/admin/lead-push/upload/${uniSlug}/${encodeFilename(fileName)}`);
      } else {
        navigate(`/admin/lead-push/upload/${uniSlug}`);
      }
    } else if (fileName) {
      // Remove filename
      navigate(`/admin/lead-push/upload/${uniSlug}`);
    } else {
      navigate('/admin/lead-push');
    }
  }, [selectedUniversity, fileName, processingState, navigate]);

  // Clear file from URL
  const handleClearFile = useCallback(() => {
    if (!selectedUniversity) return;
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    navigate(`/admin/lead-push/upload/${uniSlug}`, { replace: true });
  }, [selectedUniversity, navigate]);

  // Generate breadcrumbs for the current path
  const breadcrumbs = useMemo(() => {
    if (!selectedUniversity) return [];
    
    const uniSlug = selectedUniversity.slug || toSlug(selectedUniversity.name);
    const basePath = `/admin/lead-push/upload/${uniSlug}`;
    
    const crumbs: Array<{ label: string; path: string; isActive: boolean }> = [
      { label: 'Lead Push', path: '/admin/lead-push', isActive: false },
      { label: selectedUniversity.name, path: basePath, isActive: !fileName && processingState === 'idle' },
    ];
    
    if (fileName) {
      const filePath = `${basePath}/${encodeFilename(fileName)}`;
      crumbs.push({
        label: fileName,
        path: filePath,
        isActive: processingState === 'idle',
      });
      
      if (processingState !== 'idle') {
        crumbs.push({
          label: processingState.charAt(0).toUpperCase() + processingState.slice(1),
          path: `${filePath}/${processingState}`,
          isActive: true,
        });
      }
    } else if (processingState !== 'idle') {
      crumbs.push({
        label: processingState.charAt(0).toUpperCase() + processingState.slice(1),
        path: `${basePath}/${processingState}`,
        isActive: true,
      });
    }
    
    return crumbs;
  }, [selectedUniversity, fileName, processingState]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={navigateUp}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {fileName || processingState !== 'idle' ? 'Back' : 'Back to Lead Push'}
      </Button>
      
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => navigate('/admin/lead-push')}
          >
            <Home className="h-3.5 w-3.5" />
          </Button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.path} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={crumb.isActive ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 max-w-[200px] truncate"
                onClick={() => !crumb.isActive && navigate(crumb.path)}
                disabled={crumb.isActive}
                title={crumb.label}
              >
                {crumb.label}
              </Button>
            </div>
          ))}
        </nav>
      )}

      <DataRetentionNotice variant="banner" className="mb-4" />
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UploadLeadsTab 
            universities={universities}
            selectedUniversity={selectedUniversity}
            onSelectUniversity={handleSelectUniversity}
            onFileUpload={handleFileUpload}
            onClearFile={handleClearFile}
            onProcessingStateChange={handleProcessingStateChange}
            currentFileName={fileName}
            currentProcessingState={processingState}
          />
        </div>
        <div className="lg:col-span-1">
          <QueueMonitor />
        </div>
      </div>
    </div>
  );
}

export default memo(UploadLeadsView);
