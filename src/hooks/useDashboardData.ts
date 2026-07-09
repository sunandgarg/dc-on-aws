import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Profile
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
    },
    onError: (e) => toast.error(e.message),
  });
}

// Referrals
export type Referral = {
  id: string;
  referrer_id: string;
  friend_name: string;
  friend_mobile: string;
  friend_email: string;
  alternate_mobile: string;
  alternate_email: string;
  friend_state: string;
  friend_city: string;
  desired_city: string;
  desired_colleges: { name: string; slug: string }[];
  status: string;
  reward_amount: number;
  reward_paid: boolean;
  admin_notes: string;
  created_at: string;
  updated_at: string;
};

export function useReferrals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        desired_colleges: Array.isArray(r.desired_colleges)
          ? r.desired_colleges
          : JSON.parse(r.desired_colleges || "[]"),
      })) as Referral[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateReferral() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Referral, "id" | "referrer_id" | "status" | "reward_amount" | "reward_paid" | "admin_notes" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("referrals").insert({
        ...data,
        referrer_id: user!.id,
        desired_colleges: JSON.stringify(data.desired_colleges),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referrals"] });
      toast.success("Referral submitted successfully! 🎉");
    },
    onError: (e) => toast.error(e.message),
  });
}

// User Documents
export type UserDocument = {
  id: string;
  user_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  created_at: string;
};

export function useUserDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserDocument[];
    },
    enabled: !!user?.id,
  });
}

export function useUploadDocument() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: string }) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${docType}_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("user-documents")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("user-documents")
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from("user_documents").insert({
        user_id: user!.id,
        doc_type: docType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-documents"] });
      toast.success("Document uploaded!");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: UserDocument) => {
      // Extract path from URL
      const urlParts = doc.file_url.split("/user-documents/");
      if (urlParts[1]) {
        await supabase.storage.from("user-documents").remove([urlParts[1]]);
      }
      const { error } = await supabase.from("user_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-documents"] });
      toast.success("Document removed!");
    },
    onError: (e) => toast.error(e.message),
  });
}

// Wallet
export function useWalletBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("type, amount, status")
        .eq("user_id", user!.id)
        .eq("status", "completed");
      if (error) throw error;
      let balance = 0;
      (data ?? []).forEach((t: any) => {
        if (t.type === "credit") balance += Number(t.amount);
        else balance -= Number(t.amount);
      });
      return balance;
    },
    enabled: !!user?.id,
  });
}

export function useWalletTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
}
