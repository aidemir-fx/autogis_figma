import "vite/client";

declare module "*.svg" {
    import { FC, SVGProps } from "react";

    export const ReactComponent: FC<
        SVGProps<SVGSVGElement> & {
            title?: string;
            color?: string;
            fill?: string;
        }
    >;

    const src: string;
    export default src;
}

declare module "axios" {
    export * from "axios";
}
