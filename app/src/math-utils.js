/**
 * Convert yaw/pitch angles (degrees) to a 3D position vector.
 *
 * Yaw: 0-360°, horizontal rotation. 0° = forward (+Z), 90° = right (+X).
 * Pitch: -90 to +90°, vertical. +90° = up (+Y), -90° = down (-Y).
 * Radius: distance from origin (default 10, inside the PhotoDome).
 *
 * Returns a plain {x, y, z} object (not a Babylon Vector3) so this
 * module stays testable without Babylon.js imports.
 */
export function yawPitchToVector3(yaw, pitch, radius = 10) {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
  const y = radius * Math.sin(pitchRad);
  const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);
  return { x, y, z };
}
