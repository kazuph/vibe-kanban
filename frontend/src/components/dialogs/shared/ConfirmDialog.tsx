import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import NiceModal, { useModal } from '@ebay/nice-modal-react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useRef } from 'react';
import type { ConfirmResult } from '@/lib/modals';

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'info' | 'success';
  icon?: boolean;
}

const ConfirmDialog = NiceModal.create<ConfirmDialogProps>((props) => {
  const modal = useModal();
  const hasResolved = useRef(false);
  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    icon = true,
  } = props;

  const handleConfirm = () => {
    if (!hasResolved.current) {
      hasResolved.current = true;
      modal.resolve('confirmed' as ConfirmResult);
    }
    modal.hide();
  };

  const handleCancel = () => {
    if (!hasResolved.current) {
      hasResolved.current = true;
      modal.resolve('canceled' as ConfirmResult);
    }
    modal.hide();
  };

  const getIcon = () => {
    if (!icon) return null;

    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <XCircle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getConfirmButtonVariant = () => {
    return variant === 'destructive' ? 'destructive' : 'default';
  };

  return (
    <Dialog
      open={modal.visible}
      // Ensure closing via ESC/backdrop also hides modal state and resolves once
      onOpenChange={(open) => {
        if (!open) {
          if (!hasResolved.current) {
            hasResolved.current = true;
            modal.resolve('canceled' as ConfirmResult);
          }
          modal.hide();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button variant={getConfirmButtonVariant()} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export { ConfirmDialog };
