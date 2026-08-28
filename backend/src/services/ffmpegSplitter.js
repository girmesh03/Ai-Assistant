import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { constants } from '../utils/constants.js';
import { AppError } from '../utils/AppError.js';
import { httpStatus } from '../utils/httpStatus.js';

/** Promisified child-process runner. @type {Function} */
const run = promisify(execFile);

/**
 * Reads the duration (seconds) of an audio file via ffprobe.
 *
 * @param {string} filePath - Path to the audio file.
 * @returns {Promise<number>} Duration in seconds.
 */
export const probeDuration = async (filePath) => {
  try {
    const { stdout } = await run(env.ffprobePath, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      filePath,
    ]);
    const seconds = Number(JSON.parse(stdout)?.format?.duration);

    if (!Number.isFinite(seconds)) {
      throw new Error('ffprobe returned no duration');
    }

    return seconds;
  } catch {
    throw new AppError('Could not read the audio file.', httpStatus.BAD_REQUEST);
  }
};

/**
 * Normalizes an audio file to mono 16 kHz PCM WAV. Recordings up to the
 * segment cap are written as a single file; longer recordings are cut into
 * consecutive {@link constants.STT.MAX_SEGMENT_SECONDS}-second segments via
 * ffmpeg's segment muxer (clean boundaries — the 1s overlap from the spec
 * was dropped to avoid duplicated words at joins).
 *
 * @param {string} inputPath - Path to the uploaded audio.
 * @param {string} outDir - Directory receiving the `.wav` segment(s).
 * @returns {Promise<string[]>} Absolute paths to the segments, in order.
 */
export const splitIntoWavSegments = async (inputPath, outDir) => {
  const duration = await probeDuration(inputPath);

  if (duration < constants.STT.MIN_DURATION_SECONDS) {
    throw new AppError('Audio must be at least 1 second long.', httpStatus.BAD_REQUEST);
  }

  if (duration > constants.STT.MAX_RECORDING_SECONDS) {
    throw new AppError('Audio exceeds the 5-minute limit.', httpStatus.BAD_REQUEST);
  }

  const encodeArgs = ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le'];

  if (duration <= constants.STT.MAX_SEGMENT_SECONDS) {
    const outputPath = path.join(outDir, 'segment.wav');
    await run(env.ffmpegPath, [...encodeArgs, outputPath]);
    return [outputPath];
  }

  await run(env.ffmpegPath, [
    ...encodeArgs,
    '-f',
    'segment',
    '-segment_time',
    String(constants.STT.MAX_SEGMENT_SECONDS),
    path.join(outDir, 'segment_%03d.wav'),
  ]);

  return (await readdir(outDir))
    .filter((name) => name.endsWith('.wav'))
    .sort()
    .map((name) => path.join(outDir, name));
};