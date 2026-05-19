import localFont from "next/font/local";

export const shareTechMono = localFont({
    src: [
        {
            path: "../public/fonts/ShareTechMono-Regular.ttf",
            weight: "400",
            style: "normal",
        },
    ],
    variable: "--font-sharetech",
    display: "swap",
});
