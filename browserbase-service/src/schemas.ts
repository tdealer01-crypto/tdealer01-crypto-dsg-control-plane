import { z } from "zod";

export const UrlSchema = z.object({
  url: z.string().url(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle0", "networkidle2"]).optional()
});

export const ScreenshotSchema = z.object({
  url: z.string().url(),
  fullPage: z.boolean().optional(),
  output: z.string().optional(),
  waitMs: z.number().int().nonnegative().optional()
});

export const ScrapeSchema = z.object({
  url: z.string().url(),
  selector: z.string().optional(),
  waitSelector: z.string().optional(),
  extractLinks: z.boolean().optional(),
  maxLinks: z.number().int().positive().optional()
});

export const FormFillSchema = z.object({
  url: z.string().url(),
  fields: z.array(
    z.object({
      selector: z.string(),
      value: z.string(),
      clearFirst: z.boolean().optional()
    })
  ).min(1),
  submitSelector: z.string().optional(),
  waitAfterSubmit: z.string().optional()
});

export const LeadGenSchema = z.object({
  startUrl: z.string().url(),
  listSelector: z.string().optional(),
  itemSelectors: z.record(z.string()).optional(),
  maxItems: z.number().int().positive().optional(),
  sameOrigin: z.boolean().optional(),
  followNext: z.boolean().optional()
});

export const MonitorSchema = z.object({
  url: z.string().url(),
  intervalMs: z.number().int().positive().optional(),
  samples: z.number().int().positive().optional(),
  checkString: z.string().optional(),
  failOnHttpError: z.boolean().optional()
});
