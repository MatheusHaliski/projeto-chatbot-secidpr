import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        poster?: string;
        ar?: boolean;
        'camera-controls'?: boolean;
        'touch-action'?: string;
        'interaction-prompt'?: string;
        'auto-rotate'?: boolean;
        exposure?: string;
        'shadow-intensity'?: string;
        'camera-target'?: string;
        'camera-orbit'?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'min-field-of-view'?: string;
        'max-field-of-view'?: string;
        'disable-pan'?: boolean;
      };
    }
  }
}
