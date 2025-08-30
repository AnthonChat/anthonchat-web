"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ChannelLinkingToastProps {
  success?: string;
  error?: string;
  channelLinked?: boolean;
}

/**
 * Client component to handle channel linking toast notifications
 * This component is used by the dashboard to show success/error messages as toasts
 */
export function ChannelLinkingToast({ success, error, channelLinked }: ChannelLinkingToastProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Ensure we're on the client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Log component mounting for debugging
  useEffect(() => {
    if (!isMounted) return;
    console.log('ChannelLinkingToast: Component mounted with props', { success, error, channelLinked });
  }, [isMounted, success, error, channelLinked]);

  useEffect(() => {
    if (!isMounted || !success) return;
    
    console.log('ChannelLinkingToast: Showing success toast', { success, channelLinked });
    toast.success(
      channelLinked ? 'Channel Connected!' : 'Success!',
      {
        description: success,
        duration: 5000,
      }
    );

    // Clear URL parameters after showing the toast
    const timer = setTimeout(() => {
      router.replace('/dashboard', { scroll: false });
    }, 100); // Small delay to ensure toast is shown first

    return () => clearTimeout(timer);
  }, [success, channelLinked, isMounted, router]);

  useEffect(() => {
    if (!isMounted || !error) return;
    
    console.log('ChannelLinkingToast: Showing error toast', { error });
    toast.error(
      'Channel Connection Failed',
      {
        description: error,
        duration: 8000,
        action: {
          label: 'Try Manual Setup',
          onClick: () => {
            console.info('Manual channel setup requested');
          }
        }
      }
    );

    // Clear URL parameters after showing the toast
    const timer = setTimeout(() => {
      router.replace('/dashboard', { scroll: false });
    }, 100); // Small delay to ensure toast is shown first

    return () => clearTimeout(timer);
  }, [error, isMounted, router]);

  // This component doesn't render anything visible
  return null;
}