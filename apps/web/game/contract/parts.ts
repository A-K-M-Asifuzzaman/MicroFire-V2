import 'server-only';
import { toPartSpecs } from './specs';

// Server components only: game-core and zod stay out of the browser bundle; the client receives plain part data.
export const partSpecs = toPartSpecs;
