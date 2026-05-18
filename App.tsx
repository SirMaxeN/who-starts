import { useEffect } from 'react';
import { Platform } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewportMeta?.getAttribute('content') ?? null;
    const root = document.getElementById('root');
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyUserSelect = document.body.style.userSelect;
    const previousBodyWebkitUserSelect = document.body.style.webkitUserSelect;
    const previousBodyWebkitTouchCallout = (document.body.style as CSSStyleDeclaration & {
      webkitTouchCallout?: string;
    }).webkitTouchCallout;
    const previousRootTouchAction = root?.style.touchAction ?? null;
    const previousRootUserSelect = root?.style.userSelect ?? null;

    viewportMeta?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    );
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'manipulation';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    (document.body.style as CSSStyleDeclaration & { webkitTouchCallout?: string }).webkitTouchCallout =
      'none';

    if (root) {
      root.style.touchAction = 'manipulation';
      root.style.userSelect = 'none';
    }

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });

    return () => {
      if (previousViewport) {
        viewportMeta?.setAttribute('content', previousViewport);
      }
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.body.style.touchAction = previousBodyTouchAction;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.userSelect = previousBodyUserSelect;
      document.body.style.webkitUserSelect = previousBodyWebkitUserSelect;
      (
        document.body.style as CSSStyleDeclaration & { webkitTouchCallout?: string }
      ).webkitTouchCallout = previousBodyWebkitTouchCallout;

      if (root && previousRootTouchAction !== null) {
        root.style.touchAction = previousRootTouchAction;
      }

      if (root && previousRootUserSelect !== null) {
        root.style.userSelect = previousRootUserSelect;
      }

      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
    };
  }, []);

  return <HomeScreen />;
}
