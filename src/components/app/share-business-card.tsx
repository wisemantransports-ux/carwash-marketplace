'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Copy, MessageCircle, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ShareBusinessCardProps {
  businessId: string;
}

export function ShareBusinessCard({ businessId }: ShareBusinessCardProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && businessId) {
      setShareUrl(`${window.location.origin}/find-wash/${businessId}`);
    }
  }, [businessId]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Business link copied. Share it on WhatsApp or social media.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Please try manually selecting the link.",
      });
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl) return;
    const message = `Hi! 👋\n\nYou can now book my car wash services online here:\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!businessId) {
    return (
      <Card className="border-muted bg-muted/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
            <Share2 className="h-5 w-5" />
            Share Your Business
          </CardTitle>
          <CardDescription className="text-xs">
            Your Business ID will be used as payment reference
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-[10px] text-muted-foreground italic text-center">
            Sign in to access your unique booking link.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          Share Your Business
        </CardTitle>
        <CardDescription className="text-xs">
          Let friends and customers find and book your services easily.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <Button 
            variant="default" 
            className="w-full shadow-sm" 
            onClick={handleCopy}
          >
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Business Link'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full border-primary/20 hover:bg-primary/10"
            onClick={handleWhatsAppShare}
          >
            <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
            Share on WhatsApp
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground italic text-center">
          Anyone with this link can view your business and make a booking.
        </p>
      </CardContent>
    </Card>
  );
}
