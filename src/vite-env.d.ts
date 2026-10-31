/// <reference types="vite/client" />

declare module "react-input-mask";
declare module "*.svg" {
    const src: string;
    export default src;
}
declare module "*.png" {
    const value: string;
    export default value;
}
declare module "*.svg?raw" {
    const content: string;
    export default content;
}

declare global {
    interface Window {
        ymaps: any;
    }
}

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_YMAPS_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

declare module "react-dom/server" {
    import type { ReactElement } from "react";

    export function renderToStaticMarkup(element: ReactElement): string;
}

declare module "react-dom/client" {
    import type { ReactNode } from "react";

    interface Root {
        render(children: ReactNode): void;
        unmount(): void;
    }

    interface CreateRootOptions {
        identifierPrefix?: string;
        onRecoverableError?: (error: unknown) => void;
    }

    export function createRoot(
        container: Element | DocumentFragment,
        options?: CreateRootOptions
    ): Root;

    export function hydrateRoot(
        container: Element | DocumentFragment,
        children: ReactNode,
        options?: CreateRootOptions
    ): Root;
}
