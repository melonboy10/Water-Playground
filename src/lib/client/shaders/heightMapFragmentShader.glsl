#include <common>

uniform float mouseSize;
uniform float viscosityConstant;
uniform float heightCompensation;

#define MAX_POSITIONS 100
uniform vec3 sourceLocations[ MAX_POSITIONS ];
uniform int numPositions;

void main()	{

	// vec2 cellSize = vec2( WIDTH / MESH_WIDTH, HEIGHT / MESH_HEIGHT );
	vec2 cellSize = vec2( 1.0 / MESH_WIDTH, 1.0 / MESH_HEIGHT );

	vec2 uv = gl_FragCoord.xy * cellSize;

	// heightmapValue.x == height from previous frame
	// heightmapValue.y == height from penultimate frame
	// heightmapValue.z, heightmapValue.w not used
	vec4 heightmapValue = texture2D( heightmap, uv );

	// Get neighbours
	vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
	vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
	vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
	vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

	// https://web.archive.org/web/20080618181901/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm

	float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosityConstant;

	// Add source
	for ( int i = 0; i < numPositions; i++ ) {
		vec3 sourcePos = sourceLocations[ i ];
		float sourcePhase = clamp( length( ( uv - vec2( 0.5 ) ) * vec2(MESH_WIDTH, MESH_HEIGHT) - vec2( sourcePos.x, - sourcePos.y ) ) * PI / mouseSize, 0.0, PI );
		newHeight += ( cos( sourcePhase ) + 1. ) * 0.05 * sourcePos.z;
	}

	heightmapValue.y = heightmapValue.x;
	heightmapValue.x = newHeight;

	gl_FragColor = heightmapValue;
}