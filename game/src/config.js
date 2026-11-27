// Gobble's Great Escape — shared tuning numbers.
// One place for every constant the world, renderer and screenshot
// autopilot agree on, so a tweak here moves the whole game at once.
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const GROUND_Y = 648;

// The oven timer: the whole run is a countdown. The turkey must reach
// the forest gate before the oven is hot enough to cook it.
export const OVEN_SECONDS = 100;
export const GOAL_DISTANCE = 900; // metres of farm to cross
export const PX_PER_M = 28; // screen pixels per metre of travel

// The turkey runs at a fixed spot on screen; the farm scrolls past it.
export const TURKEY_X = 300;
export const TURKEY_W = 78;
export const TURKEY_H = 92;
export const RUN_SPEED = 11.5; // metres per second at full tilt
export const STUMBLE_SPEED = 6.0; // metres per second while recovering
export const STUMBLE_TIME = 1.1; // seconds a stumble slows the turkey
export const JUMP_VY = -1000; // pixels per second, upward
export const GRAVITY = 2000; // pixels per second squared
// A jump stays high enough to clear a fence for about 0.8s, and an
// obstacle takes about 0.4s to pass under the turkey, so a jump timed
// when the obstacle is roughly 120px ahead always clears it.

// The farmer starts this far behind (metres) and closes in slowly.
// A stumble lets him gain; a gravy boat sends him sliding backwards.
export const FARMER_START_GAP = 16;
export const FARMER_CLOSE_RATE = 0.55; // metres per second he gains
export const STUMBLE_GAP_LOSS = 6; // metres he gains on a stumble
export const GRAVY_GAP_GAIN = 14; // metres he loses slipping on gravy
export const FARMER_PASS_GAP = 26; // gap after he runs past a haystack
export const HIDE_FARMER_SPEED = 5; // metres per second he runs past

export const MAX_FEATHERS = 3; // lives: three stumbles and he is caught
export const CORN_SCORE = 25;
export const GRAVY_SCORE = 50;
export const HIDE_WINDOW = 6; // seconds a hide can last at most
