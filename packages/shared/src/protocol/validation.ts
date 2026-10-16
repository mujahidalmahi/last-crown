import { z } from 'zod';
import { INVITE_CODE_LENGTH } from '../constants/index.js';

export const InviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(INVITE_CODE_LENGTH, `Invite code must be exactly ${INVITE_CODE_LENGTH} characters`)
  .regex(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]+$/, 'Invite code contains invalid characters');

const numeric = z.union([z.number(), z.bigint()]).transform(val => Number(val));

export const PlayerInputSchema = z.object({
  sequence: numeric.pipe(z.number().int().nonnegative()),
  timestamp: numeric.pipe(z.number()),
  moveX: numeric.pipe(z.number().min(-1).max(1)),
  moveY: numeric.pipe(z.number().min(-1).max(1)).optional(),
  jump: z.boolean(),
  attack: z.boolean(),
  attackType: z.enum(['light', 'heavy', 'thrust', 'aerial', 'dash', 'sweep', 'combo']).optional(),
  block: z.boolean(),
  parry: z.boolean(),
  dash: z.boolean().optional(),
  facing: z.enum(['left', 'right']).optional(),
});

export const CreateRoomSchema = z.object({
  isPrivate: z.boolean().default(true),
  warriorPreset: z.string().min(1).max(32).default('knight'),
  playerName: z.string().trim().min(1).max(24).default('Warrior 1'),
});

export const JoinRoomSchema = z.object({
  inviteCode: InviteCodeSchema,
  warriorPreset: z.string().min(1).max(32).default('knight'),
  playerName: z.string().trim().min(1).max(24).default('Warrior 2'),
});

export type ValidatedPlayerInput = z.infer<typeof PlayerInputSchema>;
export type ValidatedCreateRoom = z.infer<typeof CreateRoomSchema>;
export type ValidatedJoinRoom = z.infer<typeof JoinRoomSchema>;
