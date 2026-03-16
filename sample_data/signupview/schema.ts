import { z } from "zod";

const nameRegex =
    /^(?!.*\b([A-Za-z]+)\b(?:[ '-]+\1\b)+)[A-Za-z]+(?:[ '-][A-Za-z]+)*$/i;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const signupBaseSchema = z.object({
    name: z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters.")
        .regex(
            nameRegex,
            "Name can only include letters, spaces, apostrophes, or hyphens, and cannot repeat the same word."
        ),
    email: z.string().email("Enter a valid email address."),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .regex(
            passwordRegex,
            "Password must include a letter, a number, and a symbol."
        ),
    confirmPassword: z.string().min(1, "Please re-enter your password."),
    dataPolicyAccepted: z
        .boolean()
        .refine((value) => value, "Please accept the data policy to continue."),
});

export const signupSchema = signupBaseSchema.refine(
    (values) => values.password === values.confirmPassword,
    {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    }
);

export const signupPayloadSchema = signupBaseSchema.omit({
    confirmPassword: true,
    dataPolicyAccepted: true,
});

export type SignupValues = z.infer<typeof signupSchema>;
