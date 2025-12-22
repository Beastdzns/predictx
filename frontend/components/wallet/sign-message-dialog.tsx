'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SignMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  embeddedWallet: any;
}

export function SignMessageDialog({
  open,
  onOpenChange,
  embeddedWallet,
}: SignMessageDialogProps) {
  const [customMessage, setCustomMessage] = useState(
    'I verify that I own this wallet on x402PM!'
  );
  const [signature, setSignature] = useState<string | undefined>();

  const onSign = async () => {
    if (!embeddedWallet || !customMessage.trim()) return;
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const _signature = await provider.request({
        method: 'personal_sign',
        params: [customMessage, accounts[0]],
      });
      setSignature(_signature as string);
    } catch (e) {
      console.error('Signature failed with error', e);
    }
  };

  const copySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(signature);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-yellow-400">
            Sign Message
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Sign a custom message to verify wallet ownership
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Your Message</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter your message to sign..."
              className="w-full px-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none transition-all min-h-25 scrollbar-hide resize-none"
            />
          </div>

          <button
            onClick={onSign}
            disabled={!customMessage.trim()}
            className="w-full py-3 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 disabled:bg-zinc-700 disabled:text-zinc-500 transition-all"
          >
            Sign Message
          </button>

          {signature && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Signature</label>
                <button
                  onClick={copySignature}
                  className="text-xs text-yellow-400 hover:underline"
                >
                  Copy
                </button>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="font-mono text-xs text-white break-all">
                  {signature}
                </p>
              </div>
              <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400 text-center">
                  ✓ Message signed successfully
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
