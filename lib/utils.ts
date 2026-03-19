export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}
