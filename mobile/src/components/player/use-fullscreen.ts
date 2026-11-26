import { useEffect } from 'react';

/**
 * Los navegadores solo permiten pantalla completa como respuesta a un gesto del usuario,
 * así que se activa con cualquier tecla del control (OK) o un toque.
 */
export function useFullscreenOnGesture() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const enter = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    };
    window.addEventListener('keydown', enter);
    window.addEventListener('pointerdown', enter);
    return () => {
      window.removeEventListener('keydown', enter);
      window.removeEventListener('pointerdown', enter);
    };
  }, []);
}
