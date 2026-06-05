export function generateAuthRbacArtifacts(required: boolean){ return { required, generated: required ? ['middleware','routes','tests'] : [] }; }
