import type { Grade, Srs } from '../src/types'

export declare function review(srs: Srs, grade: Grade, now?: number): Srs
export declare function preview(srs: Srs, grade: Grade): string
