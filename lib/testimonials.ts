/**
 * Real customer testimonials, rendered by <TestimonialsSection /> on the
 * landing page.
 *
 * THIS ARRAY IS INTENTIONALLY EMPTY. The section does not render at all while
 * it is empty, so the page simply skips it — no placeholder cards, no greyed
 * "coming soon" state.
 *
 * The design reference this was built from (a Framer template) ships with
 * three star-rated cards attributed to named people at named companies, plus a
 * "100+ projects / 95% satisfaction / 10+ years" stat row. Those people and
 * those numbers are template filler. Shipping them would put fabricated
 * endorsements on a production site — the same defect as the placeholder
 * "trusted by" logo wall removed in 4918b3b.
 *
 * TO TURN THE SECTION ON: add real entries below. Only ship a quote you
 * actually received and have permission to publish, attributed to a real
 * person. One genuine quote outperforms three invented ones, and it is the
 * only version that survives a prospect clicking through to check.
 *
 * `rating` is optional — omit it rather than inventing a star count.
 * `avatar` is optional — initials are rendered when it is absent.
 */

export interface Testimonial {
  /** The quote, verbatim. Do not tidy it up — real voices do not read like copy. */
  quote: string;
  /** Real name of a real person. */
  name: string;
  /** e.g. "Founder at Acme" */
  role: string;
  /** Optional path to an avatar image in /public. */
  avatar?: string;
  /** Optional 1–5. Omit unless they actually gave one. */
  rating?: number;
}

export const TESTIMONIALS: Testimonial[] = [];
