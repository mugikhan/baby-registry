import { z } from "zod";

export type Pin = string & { readonly __brand: "Pin" };
export type SessionSecret = string & { readonly __brand: "SessionSecret" };
export type ClientKey = string & { readonly __brand: "ClientKey" };
export type TurnstileToken = string & { readonly __brand: "TurnstileToken" };

const isPin = (input: string): input is Pin => /^\d{4}$/.test(input);
const isSessionSecret = (input: string): input is SessionSecret => input.length >= 32;
const isClientKey = (input: string): input is ClientKey => input.length > 0;
const isTurnstileToken = (input: string): input is TurnstileToken => input.length > 0;

export const PinSchema = z.string().refine(isPin, "Must be exactly 4 digits");
export const SessionSecretSchema = z
  .string()
  .refine(isSessionSecret, "Must be at least 32 characters");
export const ClientKeySchema = z.string().refine(isClientKey, "Must not be empty");
export const TurnstileTokenSchema = z.string().refine(isTurnstileToken, "Must not be empty");
