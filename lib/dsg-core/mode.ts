export function getDSGCoreMode() {
  const mode = process.env.DSG_CORE_MODE;
  return mode === 'internal' ? 'internal' : 'remote';
}

export function isInternalDSGCoreMode() {
  return getDSGCoreMode() === 'internal';
}
