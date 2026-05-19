import Swal from "sweetalert2";

type VSModalPagedProps = {
    messages: string[];
    tone?: "success" | "error";
    title: string;
    confirmText?: string; // texto do Next
};

export const VSModalPaged = async ({
                                       title,
                                       messages,
                                       tone = "error",
                                       confirmText = "Next",
                                   }: VSModalPagedProps) => {
    const iconSvg =
        tone === "success"
            ? `
<svg class="vs-auth-alert-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="4"></circle>
  <path d="M20 33l8 8 16-18" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`
            : `
<svg class="vs-auth-alert-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="4"></circle>
  <path d="M22 22l20 20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
  <path d="M42 22l-20 20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
</svg>`;

    const steps = messages.map((_, i) => `${i + 1}`);

    const base = Swal.mixin({
        buttonsStyling: false,
        customClass: {
            popup: "vs-auth-alert-popup",
            htmlContainer: "vs-auth-alert-html",
            confirmButton: "vs-auth-alert-button"
        },
        showConfirmButton: true,
        progressSteps: steps,
    });

    let i = 0;

    while (i < messages.length) {
        const isLast = i === messages.length - 1;

        const result = await base.fire({
            currentProgressStep: i,
            html: `
<div class="vs-auth-alert-inner" role="status" aria-live="polite">
  <div class="vs-auth-alert-icon">${iconSvg}</div>
  <h2 class="vs-auth-alert-title">${title}</h2>
  <p class="vs-auth-alert-message">${messages[i]}</p>
</div>`,

            confirmButtonText: isLast ? "Ok" : confirmText,
            // Opcional: permitir fechar
            showCloseButton: false,
            // Opcional: impedir clique fora
            allowOutsideClick: true,
        });

        if (result.isConfirmed) {
            if (isLast) break;
            i += 1;
            continue;


            // fechou no X / ESC / clique fora etc.
            break;
        }
    }
}
