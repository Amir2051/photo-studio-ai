const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./BTClWy23.js","./XKyaHtl9.js","./Bc52iq-9.js","./C3pvetEU.js","./BFJ6T6YK.js","./p-kBKtlv.js","./CG5x0chc.js","./BE-PioMN.js","./mpWiIG5X.js"])))=>i.map(i=>d[i]);
import{r as e,t}from"./XKyaHtl9.js";import{t as n}from"./DclECHGd.js";import{Z as r}from"./CYUhAtU5.js";import{E as i,M as a,N as o,O as s,P as c}from"./4PcklJJT.js";import{$ as l,G as u,K as d,L as f,O as p,P as m,Q as h,T as g,at as _,c as ee,et as v,f as y,k as b,lt as x,rt as S,st as te,u as C,ut as ne}from"./Bc52iq-9.js";import{a as w,n as re,o as ie,t as T}from"./ChcwShIz.js";import{r as E}from"./mpWiIG5X.js";import{O as ae,a as oe,i as se}from"./BFJ6T6YK.js";import{n as D}from"./BE-PioMN.js";import{t as ce}from"./Bj4g9K4z.js";var le=e(t(((e,t)=>{t.exports=[{name:`AdvancedMosaic`,paramsTypes:{pixelSize:`float`},defaultParams:{pixelSize:50},glsl:`// Author: Sergey Kosarevsky
// License: MIT
// Description: Both images break into large blocks that blend, then sharpen into the incoming image
// Tags: pixelate, mosaic, blend
// Ported from https://gist.github.com/corporateshark/21d2fdd24c706952dc8c

uniform float pixelSize; // = 50.0

vec4 transition(vec2 uv) {
  float T = progress;
  float half_ = 0.5;
  float size = (T < half_) ? mix(1.0, pixelSize, T / half_) : mix(pixelSize, 1.0, (T - half_) / half_);
  float D = size * 0.005;
  // Remap UV to center the mosaic pattern
  vec2 UV = (uv - 0.5) / D;
  vec2 coord = clamp(D * (ceil(UV - 0.5)) + 0.5, 0.0, 1.0);
  vec4 C0 = getFromColor(coord);
  vec4 C1 = getToColor(coord);
  return mix(C0, C1, T);
}
`,author:`Sergey Kosarevsky`,license:`MIT`,description:`Both images break into large blocks that blend, then sharpen into the incoming image`,tags:[`pixelate`,`mosaic`,`blend`],params:{pixelSize:{type:`float`,default:50}},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`BlockDissolve`,paramsTypes:{blocksize:`float`},defaultParams:{blocksize:.02},glsl:`// Author: nwoeanhinnogaehr
// License: MIT
// Description: The incoming image appears in small random blocks
// Tags: dissolve, blocks, noise
// Ported from https://gist.github.com/nwoeanhinnogaehr/b93818de23d4511fde10

uniform float blocksize; // = 0.02

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 transition(vec2 uv) {
  return mix(getFromColor(uv), getToColor(uv), step(rand(floor(uv / blocksize)), progress));
}
`,author:`nwoeanhinnogaehr`,license:`MIT`,description:`The incoming image appears in small random blocks`,tags:[`dissolve`,`blocks`,`noise`],params:{blocksize:{type:`float`,default:.02}},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`BookFlip`,paramsTypes:{},defaultParams:{},glsl:`// Author: hong
// License: MIT
// Description: The outgoing image turns like a book page from right to left, revealing the incoming one
// Tags: page, flip, 3d

// Avoids dividing by zero when the page is edge-on (progress = 0.5).
float nonZero(float x) {
  return abs(x) < 1e-4 ? (x < 0.0 ? -1e-4 : 1e-4) : x;
}

vec2 skewRight(vec2 p) {
  float skewX = (p.x - progress)/nonZero(0.5 - progress) * 0.5;
  float skewY =  (p.y - 0.5)/(0.5 + progress * (p.x - 0.5) / 0.5)* 0.5  + 0.5;
  return vec2(skewX, skewY);
}

vec2 skewLeft(vec2 p) {
  float skewX = (p.x - 0.5)/nonZero(progress - 0.5) * 0.5 + 0.5;
  float skewY = (p.y - 0.5) / (0.5 + (1.0 - progress ) * (0.5 - p.x) / 0.5) * 0.5  + 0.5;
  return vec2(skewX, skewY);
}

vec4 addShade() {
  float shadeVal  =  max(0.7, abs(progress - 0.5) * 2.0);
  return vec4(vec3(shadeVal ), 1.0);
}

vec4 transition (vec2 p) {
  float pr = step(1.0 - progress, p.x);

  if (p.x < 0.5) {
    return mix(getFromColor(p), getToColor(skewLeft(p)) * addShade(), pr);
  } else {
    return mix(getFromColor(skewRight(p)) * addShade(), getToColor(p),   pr);
  }
}
`,author:`hong`,license:`MIT`,description:`The outgoing image turns like a book page from right to left, revealing the incoming one`,tags:[`page`,`flip`,`3d`],params:{},textures:[],createdAt:`Fri, 27 May 2022 19:13:57 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Bounce`,paramsTypes:{shadow_colour:`vec4`,shadow_height:`float`,bounces:`float`},defaultParams:{shadow_colour:[0,0,0,.6],shadow_height:.075,bounces:3},glsl:`// Author: Adrian Purser
// License: MIT
// Description: The outgoing image drops out of the frame with a few bounces, revealing the incoming one
// Tags: bounce, slide, vertical, shadow

// @color Color of the shadow cast on the incoming image
uniform vec4 shadow_colour; // = vec4(0.,0.,0.,.6)
// @range(0.01, 0.5) Height of the shadow, relative to the image height
uniform float shadow_height; // = 0.075
// @range(1, 10, 1) Number of bounces before settling
uniform float bounces; // = 3.0

const float PI = 3.14159265358;

vec4 transition (vec2 uv) {
  float time = progress;
  float stime = sin(time * PI / 2.);
  float phase = time * PI * bounces;
  float y = (abs(cos(phase))) * (1.0 - stime);
  float d = uv.y - y;
  return mix(
    mix(
      getToColor(uv),
      shadow_colour,
      step(d, shadow_height) * (1. - mix(
        ((d / shadow_height) * shadow_colour.a) + (1.0 - shadow_colour.a),
        1.0,
        smoothstep(0.95, 1., progress) // fade-out the shadow at the end
      ))
    ),
    getFromColor(vec2(uv.x, uv.y + (1.0 - y))),
    step(d, 0.0)
  );
}
`,author:`Adrian Purser`,license:`MIT`,description:`The outgoing image drops out of the frame with a few bounces, revealing the incoming one`,tags:[`bounce`,`slide`,`vertical`,`shadow`],params:{shadow_colour:{type:`vec4`,default:[0,0,0,.6],color:!0,description:`Color of the shadow cast on the incoming image`},shadow_height:{type:`float`,default:.075,min:.01,max:.5,description:`Height of the shadow, relative to the image height`},bounces:{type:`float`,default:3,min:1,max:10,step:1,description:`Number of bounces before settling`}},textures:[],createdAt:`Fri, 10 Nov 2017 17:01:45 +0000`,updatedAt:`Fri, 9 Oct 2026 23:18:05 +0200`},{name:`BowTieHorizontal`,paramsTypes:{},defaultParams:{},glsl:`// Author: huynx
// License: MIT
// Description: Two triangles grow from the left and right edges into a bow tie that reveals the incoming image
// Tags: wipe, shape, horizontal

const vec2 bottom_left = vec2(0.0, 1.0);
const vec2 bottom_right = vec2(1.0, 1.0);
const vec2 top_left = vec2(0.0, 0.0);
const vec2 top_right = vec2(1.0, 0.0);
const vec2 center = vec2(0.5, 0.5);

float check(vec2 p1, vec2 p2, vec2 p3)
{
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

bool PointInTriangle (vec2 pt, vec2 p1, vec2 p2, vec2 p3)
{
    bool b1, b2, b3;
    b1 = check(pt, p1, p2) < 0.0;
    b2 = check(pt, p2, p3) < 0.0;
    b3 = check(pt, p3, p1) < 0.0;
    return ((b1 == b2) && (b2 == b3));
}

bool in_left_triangle(vec2 p){
  vec2 vertex1, vertex2, vertex3;
  vertex1 = vec2(progress, 0.5);
  vertex2 = vec2(0.0, 0.5-progress);
  vertex3 = vec2(0.0, 0.5+progress);
  if (PointInTriangle(p, vertex1, vertex2, vertex3))
  {
    return true;
  }
  return false;
}

bool in_right_triangle(vec2 p){
  vec2 vertex1, vertex2, vertex3;
  vertex1 = vec2(1.0-progress, 0.5);
  vertex2 = vec2(1.0, 0.5-progress);
  vertex3 = vec2(1.0, 0.5+progress);
  if (PointInTriangle(p, vertex1, vertex2, vertex3))
  {
    return true;
  }
  return false;
}

float blur_edge(vec2 bot1, vec2 bot2, vec2 top, vec2 testPt)
{
  vec2 lineDir = bot1 - top;
  vec2 perpDir = vec2(lineDir.y, -lineDir.x);
  vec2 dirToPt1 = bot1 - testPt;
  float dist1 = abs(dot(normalize(perpDir), dirToPt1));
  
  lineDir = bot2 - top;
  perpDir = vec2(lineDir.y, -lineDir.x);
  dirToPt1 = bot2 - testPt;
  float min_dist = min(abs(dot(normalize(perpDir), dirToPt1)), dist1);
  
  if (min_dist < 0.005) {
    return min_dist / 0.005;
  }
  else  {
    return 1.0;
  };
}


vec4 transition (vec2 uv) {
  if (in_left_triangle(uv))
  {
    if (progress < 0.1)
    {
      return getFromColor(uv);
    }
    if (uv.x < 0.5)
    {
      vec2 vertex1 = vec2(progress, 0.5);
      vec2 vertex2 = vec2(0.0, 0.5-progress);
      vec2 vertex3 = vec2(0.0, 0.5+progress);
      return mix(
        getFromColor(uv),
        getToColor(uv),
        blur_edge(vertex2, vertex3, vertex1, uv)
      );
    }
    else
    {
      if (progress > 0.0)
      {
        return getToColor(uv);
      }
      else
      {
        return getFromColor(uv);
      }
    }    
  }
  else if (in_right_triangle(uv))
  {
    if (uv.x >= 0.5)
    {
      vec2 vertex1 = vec2(1.0-progress, 0.5);
      vec2 vertex2 = vec2(1.0, 0.5-progress);
      vec2 vertex3 = vec2(1.0, 0.5+progress);
      return mix(
        getFromColor(uv),
        getToColor(uv),
        blur_edge(vertex2, vertex3, vertex1, uv)
      );  
    }
    else
    {
      return getFromColor(uv);
    }
  }
  else {
    return getFromColor(uv);
  }
}`,author:`huynx`,license:`MIT`,description:`Two triangles grow from the left and right edges into a bow tie that reveals the incoming image`,tags:[`wipe`,`shape`,`horizontal`],params:{},textures:[],createdAt:`Sat, 24 Mar 2018 12:54:26 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`BowTieVertical`,paramsTypes:{},defaultParams:{},glsl:`// Author: huynx
// License: MIT
// Description: Two triangles grow from the top and bottom edges into a bow tie that reveals the incoming image
// Tags: wipe, shape, vertical

float check(vec2 p1, vec2 p2, vec2 p3)
{
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

bool PointInTriangle (vec2 pt, vec2 p1, vec2 p2, vec2 p3)
{
    bool b1, b2, b3;
    b1 = check(pt, p1, p2) < 0.0;
    b2 = check(pt, p2, p3) < 0.0;
    b3 = check(pt, p3, p1) < 0.0;
    return ((b1 == b2) && (b2 == b3));
}

bool in_top_triangle(vec2 p){
  vec2 vertex1, vertex2, vertex3;
  vertex1 = vec2(0.5, progress);
  vertex2 = vec2(0.5-progress, 0.0);
  vertex3 = vec2(0.5+progress, 0.0);
  if (PointInTriangle(p, vertex1, vertex2, vertex3))
  {
    return true;
  }
  return false;
}

bool in_bottom_triangle(vec2 p){
  vec2 vertex1, vertex2, vertex3;
  vertex1 = vec2(0.5, 1.0 - progress);
  vertex2 = vec2(0.5-progress, 1.0);
  vertex3 = vec2(0.5+progress, 1.0);
  if (PointInTriangle(p, vertex1, vertex2, vertex3))
  {
    return true;
  }
  return false;
}

float blur_edge(vec2 bot1, vec2 bot2, vec2 top, vec2 testPt)
{
  vec2 lineDir = bot1 - top;
  vec2 perpDir = vec2(lineDir.y, -lineDir.x);
  vec2 dirToPt1 = bot1 - testPt;
  float dist1 = abs(dot(normalize(perpDir), dirToPt1));
  
  lineDir = bot2 - top;
  perpDir = vec2(lineDir.y, -lineDir.x);
  dirToPt1 = bot2 - testPt;
  float min_dist = min(abs(dot(normalize(perpDir), dirToPt1)), dist1);
  
  if (min_dist < 0.005) {
    return min_dist / 0.005;
  }
  else  {
    return 1.0;
  };
}


vec4 transition (vec2 uv) {
  if (in_top_triangle(uv))
  {
    if (progress < 0.1)
    {
      return getFromColor(uv);
    }
    if (uv.y < 0.5)
    {
      vec2 vertex1 = vec2(0.5, progress);
      vec2 vertex2 = vec2(0.5-progress, 0.0);
      vec2 vertex3 = vec2(0.5+progress, 0.0);
      return mix(
        getFromColor(uv),
        getToColor(uv),
        blur_edge(vertex2, vertex3, vertex1, uv)
      );
    }
    else
    {
      if (progress > 0.0)
      {
        return getToColor(uv);
      }
      else
      {
        return getFromColor(uv);
      }
    }    
  }
  else if (in_bottom_triangle(uv))
  {
    if (uv.y >= 0.5)
    {
      vec2 vertex1 = vec2(0.5, 1.0-progress);
      vec2 vertex2 = vec2(0.5-progress, 1.0);
      vec2 vertex3 = vec2(0.5+progress, 1.0);
      return mix(
        getFromColor(uv),
        getToColor(uv),
        blur_edge(vertex2, vertex3, vertex1, uv)
      );  
    }
    else
    {
      return getFromColor(uv);
    }
  }
  else {
    return getFromColor(uv);
  }
}`,author:`huynx`,license:`MIT`,description:`Two triangles grow from the top and bottom edges into a bow tie that reveals the incoming image`,tags:[`wipe`,`shape`,`vertical`],params:{},textures:[],createdAt:`Tue, 27 Mar 2018 10:07:54 +0700`,updatedAt:`Fri, 9 Oct 2026 23:12:22 +0200`},{name:`BowTieWithParameter`,paramsTypes:{adjust:`float`,reverse:`bool`},defaultParams:{adjust:.5,reverse:!1},glsl:`// Author: KMojek
// License: MIT
// Description: A bow-tie wipe with an adjustable shape that can run in reverse
// Tags: wipe, shape

uniform float adjust; // = 0.5
// @param Run the wipe in reverse
uniform bool reverse; // = false

float check(vec2 p1, vec2 p2, vec2 p3)
{
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

bool pointInTriangle(vec2 pt, vec2 p1, vec2 p2, vec2 p3)
{

    bool b1 = check(pt, p1, p2) < 0.0;
    bool b2 = check(pt, p2, p3) < 0.0;
    bool b3 = check(pt, p3, p1) < 0.0;
    return b1 == b2 && b2 == b3;
}

const float height = 0.5;

vec4 transition_firstHalf( vec2 uv, float prog )
{
  if ( uv.y < 0.5 )
  {
    vec2 botLeft = vec2( -0., prog-height );
    vec2 botRight = vec2( 1., prog-height );
    vec2 tip = vec2( adjust, prog );
    if ( pointInTriangle( uv, botLeft, botRight, tip ) )
        return getToColor(uv);
    }
  else
  {
    vec2 topLeft = vec2( -0., 1.-prog+height );
    vec2 topRight = vec2( 1., 1.-prog+height );
    vec2 tip = vec2( adjust, 1.-prog );
    if ( pointInTriangle( uv, topLeft, topRight, tip ) )
      return getToColor( uv );
  }
  return getFromColor( uv );
}

vec4 transition_secondHalf( vec2 uv, float prog )
{
  if ( uv.x > adjust )
  {
    vec2 top = vec2( prog + height,  1. );
    vec2 bot = vec2( prog + height, -0. );
    vec2 tip = vec2( mix( adjust, 1.0, 2.0 * (prog - 0.5) ), 0.5 );
    if ( pointInTriangle( uv, top, bot, tip) )
      return getFromColor( uv );
  }
  else
  {
    vec2 top = vec2( 1.0-prog - height,  1. );
    vec2 bot = vec2( 1.0-prog - height, -0. );
    vec2 tip = vec2( mix( adjust, 0.0, 2.0 * (prog - 0.5)  ), 0.5 );
    if ( pointInTriangle( uv, top, bot, tip) )
      return getFromColor( uv );
  }
  return getToColor( uv );
}

vec4 transition (vec2 uv) {
  if ( reverse )
    return ( progress < 0.5 ) ? transition_secondHalf( uv, 1.-progress ) : transition_firstHalf( uv, 1.-progress );
  else
    return ( progress < 0.5 ) ? transition_firstHalf( uv, progress ) : transition_secondHalf( uv, progress );
}`,author:`KMojek`,license:`MIT`,description:`A bow-tie wipe with an adjustable shape that can run in reverse`,tags:[`wipe`,`shape`],params:{adjust:{type:`float`,default:.5},reverse:{type:`bool`,default:!1,description:`Run the wipe in reverse`}},textures:[],createdAt:`Thu, 19 Mar 2020 21:36:12 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Box`,paramsTypes:{rectIn:`int`,location:`int`},defaultParams:{rectIn:1,location:0},glsl:`// Author: lql
// License: MIT
// Description: The outgoing image shrinks into a box, toward the center or a corner, revealing the incoming one
// Tags: box, zoom, shape
uniform int rectIn; // =1
// center:0, left_top:1, left_bottom:2, right_top:3, right_bottom:4
// @range(0, 4, 1) Where the box goes: 0 center, 1 left top, 2 left bottom, 3 right top, 4 right bottom
uniform int location; // =0

vec4 transition(vec2 uv) {
    float p = rectIn == 1 ? 1.0 - progress : progress;
    float x1, y1, x2, y2;

    // Determine rectangle coordinates based on location
    if (location == 0) {
        x1 = y1 = 0.5 * (1.0 - p);
        x2 = y2 = 1.0 - x1;
    } else {
        // Calculate the x and y coordinates based on the location
        x1 = (location == 1 || location == 2) ? 0.0 : 1.0 - p;
        y1 = (location == 1 || location == 3) ? 1.0 - p : 0.0;
        x2 = (location == 1 || location == 2) ? p : 1.0;
        y2 = (location == 1 || location == 3) ? 1.0 : p;
    }

    // Determine if the point is inside the rectangle
    float in_rect = step(x1, uv.x) * step(uv.x, x2) * step(y1, uv.y) * step(uv.y, y2);
    in_rect = rectIn == 1 ? 1.0 - in_rect : in_rect;

    // Mix colors based on the in_rect value
    return mix(getFromColor(uv), getToColor(uv), in_rect);
}
`,author:`lql`,license:`MIT`,description:`The outgoing image shrinks into a box, toward the center or a corner, revealing the incoming one`,tags:[`box`,`zoom`,`shape`],params:{rectIn:{type:`int`,default:1},location:{type:`int`,default:0,min:0,max:4,step:1,description:`Where the box goes: 0 center, 1 left top, 2 left bottom, 3 right top, 4 right bottom`}},textures:[],createdAt:`Tue, 23 Jan 2024 23:06:37 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`ButterflyWaveScrawler`,paramsTypes:{amplitude:`float`,waves:`float`,colorSeparation:`float`},defaultParams:{amplitude:1,waves:30,colorSeparation:.3},glsl:`// Author: mandubian
// License: MIT
// Description: Wavy, color-separated ripples scramble the outgoing image into the incoming one
// Tags: wave, distort, chromatic
uniform float amplitude; // = 1.0
uniform float waves; // = 30.0
uniform float colorSeparation; // = 0.3
const float PI = 3.14159265358979323846264;
float compute(vec2 p, float progress, vec2 center) {
vec2 o = p*sin(progress * amplitude)-center;
// horizontal vector
vec2 h = vec2(1., 0.);
// butterfly polar function (don't ask me why this one :))
float theta = acos(dot(o, h)) * waves;
float s = sin((2.*theta - PI) / 24.);
float s2 = s * s;
return (exp(cos(theta)) - 2.*cos(4.*theta) + s2 * s2 * s) / 10.;
}
vec4 transition(vec2 uv) {
  if (progress <= 0.0) return getFromColor(uv);
  if (progress >= 1.0) return getToColor(uv);
  vec2 p = uv;
  float inv = 1. - progress;
  float disp = compute(p, progress, vec2(0.5, 0.5));
  vec4 texTo = getToColor(p + inv*disp);
  vec4 texFrom = vec4(
    getFromColor(p + progress*disp*(1.0 - colorSeparation)).r,
    getFromColor(p + progress*disp).g,
    getFromColor(p + progress*disp*(1.0 + colorSeparation)).b,
    1.0);
  return texTo*progress + texFrom*inv;
}
`,author:`mandubian`,license:`MIT`,description:`Wavy, color-separated ripples scramble the outgoing image into the incoming one`,tags:[`wave`,`distort`,`chromatic`],params:{amplitude:{type:`float`,default:1},waves:{type:`float`,default:30},colorSeparation:{type:`float`,default:.3}},textures:[],createdAt:`Thu, 1 Jun 2017 11:47:17 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`CircleCrop`,paramsTypes:{bgcolor:`vec4`},defaultParams:{bgcolor:[0,0,0,1]},glsl:`// License: MIT
// Author: fkuteken
// Description: The outgoing image closes into a circle over a background color, then the incoming one opens from it
// Tags: circle, iris, shape
// ported by gre from https://gist.github.com/fkuteken/f63e3009c1143950dee9063c3b83fb88

// @color Background color
uniform vec4 bgcolor; // = vec4(0.0, 0.0, 0.0, 1.0)

vec4 transition(vec2 p) {
  vec2 ratio2 = vec2(1.0, 1.0 / ratio);
  float s = pow(2.0 * abs(progress - 0.5), 3.0);
  float dist = length((vec2(p) - 0.5) * ratio2);
  return mix(
    progress < 0.5 ? getFromColor(p) : getToColor(p), // branching is ok here as we statically depend on progress uniform (branching won't change over pixels)
    bgcolor,
    step(s, dist)
  );
}
`,author:`fkuteken`,license:`MIT`,description:`The outgoing image closes into a circle over a background color, then the incoming one opens from it`,tags:[`circle`,`iris`,`shape`],params:{bgcolor:{type:`vec4`,default:[0,0,0,1],color:!0,description:`Background color`}},textures:[],createdAt:`Mon, 12 Jun 2017 12:52:34 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`ColourDistance`,paramsTypes:{power:`float`},defaultParams:{power:5},glsl:`// License: MIT
// Author: P-Seebauer
// Description: Pixels switch to the incoming image in order of how close their colors are
// Tags: blend, color
// ported by gre from https://gist.github.com/P-Seebauer/2a5fa2f77c883dd661f9

uniform float power; // = 5.0

vec4 transition(vec2 p) {
  vec4 fTex = getFromColor(p);
  vec4 tTex = getToColor(p);
  float m = step(distance(fTex, tTex), progress);
  return mix(
    mix(fTex, tTex, m),
    tTex,
    pow(progress, power)
  );
}
`,author:`P-Seebauer`,license:`MIT`,description:`Pixels switch to the incoming image in order of how close their colors are`,tags:[`blend`,`color`],params:{power:{type:`float`,default:5}},textures:[],createdAt:`Mon, 12 Jun 2017 12:57:42 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`CrazyParametricFun`,paramsTypes:{a:`float`,b:`float`,amplitude:`float`,smoothness:`float`},defaultParams:{a:4,b:1,amplitude:120,smoothness:.1},glsl:`// Author: mandubian
// License: MIT
// Description: The outgoing image is pulled along a parametric curve into a psychedelic swirl
// Tags: distort, psychedelic

uniform float a; // = 4
uniform float b; // = 1
uniform float amplitude; // = 120
uniform float smoothness; // = 0.1

vec4 transition(vec2 uv) {
  vec2 p = uv.xy / vec2(1.0).xy;
  vec2 dir = p - vec2(.5);
  float dist = length(dir);
  float x = (a - b) * cos(progress) + b * cos(progress * ((a / b) - 1.) );
  float y = (a - b) * sin(progress) - b * sin(progress * ((a / b) - 1.));
  vec2 offset = dir * vec2(sin(progress  * dist * amplitude * x), sin(progress * dist * amplitude * y)) / smoothness;
  return mix(getFromColor(p + offset), getToColor(p), smoothstep(0.2, 1.0, progress));
}
`,author:`mandubian`,license:`MIT`,description:`The outgoing image is pulled along a parametric curve into a psychedelic swirl`,tags:[`distort`,`psychedelic`],params:{a:{type:`float`,default:4},b:{type:`float`,default:1},amplitude:{type:`float`,default:120},smoothness:{type:`float`,default:.1}},textures:[],createdAt:`Thu, 1 Jun 2017 13:03:12 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`CrossZoom`,paramsTypes:{strength:`float`},defaultParams:{strength:.4},glsl:`// License: MIT
// Author: rectalogic
// Description: A crossfade through a strong zoom blur
// Tags: zoom, blur, blend
// ported by gre from https://gist.github.com/rectalogic/b86b90161503a0023231

// Converted from https://github.com/rectalogic/rendermix-basic-effects/blob/master/assets/com/rendermix/CrossZoom/CrossZoom.frag
// Which is based on https://github.com/evanw/glfx.js/blob/master/src/filters/blur/zoomblur.js
// With additional easing functions from https://github.com/rectalogic/rendermix-basic-effects/blob/master/assets/com/rendermix/Easing/Easing.glsllib

// @range(0, 1) Blur strength
uniform float strength; // = 0.4

const float PI = 3.141592653589793;

float Linear_ease(in float begin, in float change, in float duration, in float time) {
    return change * time / duration + begin;
}

float Exponential_easeInOut(in float begin, in float change, in float duration, in float time) {
    if (time == 0.0)
        return begin;
    else if (time == duration)
        return begin + change;
    time = time / (duration / 2.0);
    if (time < 1.0)
        return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin;
    return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;
}

float Sinusoidal_easeInOut(in float begin, in float change, in float duration, in float time) {
    return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;
}

float rand (vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 crossFade(in vec2 uv, in float dissolve) {
    return mix(getFromColor(uv), getToColor(uv), dissolve);
}

vec4 transition(vec2 uv) {
    vec2 texCoord = uv.xy / vec2(1.0).xy;

    // Linear interpolate center across center half of the image
    vec2 center = vec2(Linear_ease(0.25, 0.5, 1.0, progress), 0.5);
    float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress);

    // Mirrored sinusoidal loop. 0->strength then strength->0
    float strength = Sinusoidal_easeInOut(0.0, strength, 0.5, progress);

    vec4 color = vec4(0.0);
    float total = 0.0;
    vec2 toCenter = center - texCoord;

    /* randomize the lookup values to hide the fixed number of samples */
    float offset = rand(uv);

    for (float t = 0.0; t <= 40.0; t++) {
        float percent = (t + offset) / 40.0;
        float weight = 4.0 * (percent - percent * percent);
        color += crossFade(texCoord + toCenter * percent * strength, dissolve) * weight;
        total += weight;
    }
    return color / total;
}
`,author:`rectalogic`,license:`MIT`,description:`A crossfade through a strong zoom blur`,tags:[`zoom`,`blur`,`blend`],params:{strength:{type:`float`,default:.4,min:0,max:1,description:`Blur strength`}},textures:[],createdAt:`Mon, 12 Jun 2017 12:33:07 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`DefocusBlur`,paramsTypes:{blurSize:`float`},defaultParams:{blurSize:.02},glsl:`// Author: Sergey Kosarevsky
// License: MIT
// Description: A crossfade through an out-of-focus blur
// Tags: blur, blend
// Ported from https://gist.github.com/corporateshark/b9f8e5675c647e615419

// @param Amount of blur
uniform float blurSize; // = 0.02

// 12-tap Poisson disk
// https://github.com/spite/Wagner/blob/master/fragment-shaders/poisson-disc-blur-fs.glsl

vec4 transition(vec2 uv) {
  float T = progress;
  float half_ = 0.5;
  float D = (T < half_) ? mix(0.0, blurSize, T / half_) : mix(blurSize, 0.0, (T - half_) / half_);
  vec4 C0 = getFromColor(uv);
  vec4 C1 = getToColor(uv);
  C0 += getFromColor(vec2(-0.326, -0.406) * D + uv);
  C1 += getToColor(vec2(-0.326, -0.406) * D + uv);
  C0 += getFromColor(vec2(-0.840, -0.074) * D + uv);
  C1 += getToColor(vec2(-0.840, -0.074) * D + uv);
  C0 += getFromColor(vec2(-0.696,  0.457) * D + uv);
  C1 += getToColor(vec2(-0.696,  0.457) * D + uv);
  C0 += getFromColor(vec2(-0.203,  0.621) * D + uv);
  C1 += getToColor(vec2(-0.203,  0.621) * D + uv);
  C0 += getFromColor(vec2( 0.962, -0.195) * D + uv);
  C1 += getToColor(vec2( 0.962, -0.195) * D + uv);
  C0 += getFromColor(vec2( 0.473, -0.480) * D + uv);
  C1 += getToColor(vec2( 0.473, -0.480) * D + uv);
  C0 += getFromColor(vec2( 0.519,  0.767) * D + uv);
  C1 += getToColor(vec2( 0.519,  0.767) * D + uv);
  C0 += getFromColor(vec2( 0.185, -0.893) * D + uv);
  C1 += getToColor(vec2( 0.185, -0.893) * D + uv);
  C0 += getFromColor(vec2( 0.507,  0.064) * D + uv);
  C1 += getToColor(vec2( 0.507,  0.064) * D + uv);
  C0 += getFromColor(vec2( 0.896,  0.412) * D + uv);
  C1 += getToColor(vec2( 0.896,  0.412) * D + uv);
  C0 += getFromColor(vec2(-0.322, -0.933) * D + uv);
  C1 += getToColor(vec2(-0.322, -0.933) * D + uv);
  C0 += getFromColor(vec2(-0.792, -0.598) * D + uv);
  C1 += getToColor(vec2(-0.792, -0.598) * D + uv);
  C0 /= 13.0;
  C1 /= 13.0;
  return mix(C0, C1, T);
}
`,author:`Sergey Kosarevsky`,license:`MIT`,description:`A crossfade through an out-of-focus blur`,tags:[`blur`,`blend`],params:{blurSize:{type:`float`,default:.02,description:`Amount of blur`}},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Directional`,paramsTypes:{direction:`vec2`},defaultParams:{direction:[0,1]},glsl:`// Author: Gaëtan Renaudeau
// License: MIT
// Description: The incoming image pushes the outgoing one out in a given direction
// Tags: slide, push, directional

// @param Direction of the movement
uniform vec2 direction; // = vec2(0.0, 1.0)

vec4 transition (vec2 uv) {
  vec2 p = uv + progress * sign(direction);
  vec2 f = fract(p);
  return mix(
    getToColor(f),
    getFromColor(f),
    step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0)
  );
}
`,author:`Gaëtan Renaudeau`,license:`MIT`,description:`The incoming image pushes the outgoing one out in a given direction`,tags:[`slide`,`push`,`directional`],params:{direction:{type:`vec2`,default:[0,1],description:`Direction of the movement`}},textures:[],createdAt:`Thu, 19 Apr 2018 12:20:29 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`DirectionalScaled`,paramsTypes:{direction:`vec2`,scale:`float`},defaultParams:{direction:[0,1],scale:.7},glsl:`// Author: Thibaut Foussard
// based on Directional transition by Gaëtan Renaudeau
// https://gl-transitions.com/editor/Directional
// License: MIT
// Description: Like Directional, with both images scaled down while they slide
// Tags: slide, push, zoom, directional

#define PI acos(-1.0)

// @param Direction of the movement
uniform vec2 direction; // = vec2(0.0, 1.0)
uniform float scale; // = .7

float parabola(float x) {
  float y = pow(sin(x * PI), 1.);
  return y;
}

vec4 transition (vec2 uv) {
  float easedProgress = pow(sin(progress  * PI / 2.), 3.);
  vec2 p = uv + easedProgress * sign(direction);
  vec2 f = fract(p);
  
  float s = 1. - (1. - (1. / scale)) * parabola(progress);
  f = (f - 0.5) * s  + 0.5;
  
  float mixer = step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0);
  vec4 col = mix(getToColor(f), getFromColor(f), mixer);
  
  float border = step(0., f.x) * step(0., (1. - f.x)) * step(0., f.y) * step(0., 1. - f.y);
  col *= border;
  
  return col;
}
`,author:`Thibaut Foussard`,license:`MIT`,description:`Like Directional, with both images scaled down while they slide`,tags:[`slide`,`push`,`zoom`,`directional`],params:{direction:{type:`vec2`,default:[0,1],description:`Direction of the movement`},scale:{type:`float`,default:.7}},textures:[],createdAt:`Tue, 4 Apr 2023 03:29:34 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`DoomScreenTransition`,paramsTypes:{bars:`int`,amplitude:`float`,noise:`float`,frequency:`float`,dripScale:`float`},defaultParams:{bars:30,amplitude:2,noise:.1,frequency:.5,dripScale:.5},glsl:`// Author: Zeh Fernando
// License: MIT
// Description: The outgoing image melts down in uneven columns, like the Doom screen wipe
// Tags: melt, columns, retro


// Transition parameters --------

// Number of total bars/columns
uniform int bars; // = 30

// Multiplier for speed ratio. 0 = no variation when going down, higher = some elements go much faster
uniform float amplitude; // = 2

// Further variations in speed. 0 = no noise, 1 = super noisy (ignore frequency)
uniform float noise; // = 0.1

// Speed variation horizontally. the bigger the value, the shorter the waves
uniform float frequency; // = 0.5

// How much the bars seem to "run" from the middle of the screen first (sticking to the sides). 0 = no drip, 1 = curved drip
uniform float dripScale; // = 0.5


// The code proper --------

float rand(int num) {
  return fract(mod(float(num) * 67123.313, 12.0) * sin(float(num) * 10.3) * cos(float(num)));
}

float wave(int num) {
  float fn = float(num) * frequency * 0.1 * float(bars);
  return cos(fn * 0.5) * cos(fn * 0.13) * sin((fn+10.0) * 0.3) / 2.0 + 0.5;
}

float drip(int num) {
  return sin(float(num) / float(bars - 1) * 3.141592) * dripScale;
}

float pos(int num) {
  return (noise == 0.0 ? wave(num) : mix(wave(num), rand(num), noise)) + (dripScale == 0.0 ? 0.0 : drip(num));
}

vec4 transition(vec2 uv) {
  int bar = int(uv.x * (float(bars)));
  float scale = 1.0 + pos(bar) * amplitude;
  float phase = progress * scale;
  float posY = uv.y / vec2(1.0).y;
  vec2 p;
  vec4 c;
  if (phase + posY < 1.0) {
    p = vec2(uv.x, uv.y + mix(0.0, vec2(1.0).y, phase)) / vec2(1.0).xy;
    c = getFromColor(p);
  } else {
    p = uv.xy / vec2(1.0).xy;
    c = getToColor(p);
  }

  // Finally, apply the color
  return c;
}
`,author:`Zeh Fernando`,license:`MIT`,description:`The outgoing image melts down in uneven columns, like the Doom screen wipe`,tags:[`melt`,`columns`,`retro`],params:{bars:{type:`int`,default:30},amplitude:{type:`float`,default:2},noise:{type:`float`,default:.1},frequency:{type:`float`,default:.5},dripScale:{type:`float`,default:.5}},textures:[],createdAt:`Tue, 30 May 2017 09:39:09 -0700`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Dreamy`,paramsTypes:{},defaultParams:{},glsl:`// Author: mikolalysenko
// License: MIT
// Description: A crossfade with a gentle wavy distortion
// Tags: wave, blend

vec2 offset(float progress, float x, float theta) {
  float phase = progress*progress + progress + theta;
  float shifty = 0.03*progress*cos(10.0*(progress+x));
  return vec2(0, shifty);
}
vec4 transition(vec2 p) {
  return mix(getFromColor(p + offset(progress, p.x, 0.0)), getToColor(p + offset(1.0-progress, p.x, 3.14)), progress);
}
`,author:`mikolalysenko`,license:`MIT`,description:`A crossfade with a gentle wavy distortion`,tags:[`wave`,`blend`],params:{},textures:[],createdAt:`Mon, 12 Jun 2017 12:27:38 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`DreamyZoom`,paramsTypes:{rotation:`float`,scale:`float`},defaultParams:{rotation:6,scale:1.2},glsl:`// Author: Zeh Fernando
// License: MIT
// Description: Zooms and rotates into a bright flash, then out to the incoming image
// Tags: zoom, rotate, flash

// Definitions --------
#define DEG2RAD 0.03926990816987241548078304229099 // 1/180*PI


// Transition parameters --------

// In degrees
uniform float rotation; // = 6

// Multiplier
uniform float scale; // = 1.2


// The code proper --------

vec4 transition(vec2 uv) {
  // Massage parameters
  float phase = progress < 0.5 ? progress * 2.0 : (progress - 0.5) * 2.0;
  float angleOffset = progress < 0.5 ? mix(0.0, rotation * DEG2RAD, phase) : mix(-rotation * DEG2RAD, 0.0, phase);
  float newScale = progress < 0.5 ? mix(1.0, scale, phase) : mix(scale, 1.0, phase);
  
  vec2 center = vec2(0, 0);

  // Calculate the source point
  vec2 assumedCenter = vec2(0.5, 0.5);
  vec2 p = (uv.xy - vec2(0.5, 0.5)) / newScale * vec2(ratio, 1.0);

  // This can probably be optimized (with distance())
  float angle = atan(p.y, p.x) + angleOffset;
  float dist = distance(center, p);
  p.x = cos(angle) * dist / ratio + 0.5;
  p.y = sin(angle) * dist + 0.5;
  vec4 c = progress < 0.5 ? getFromColor(p) : getToColor(p);

  // Finally, apply the color
  return c + (progress < 0.5 ? mix(0.0, 1.0, phase) : mix(1.0, 0.0, phase));
}
`,author:`Zeh Fernando`,license:`MIT`,description:`Zooms and rotates into a bright flash, then out to the incoming image`,tags:[`zoom`,`rotate`,`flash`],params:{rotation:{type:`float`,default:6},scale:{type:`float`,default:1.2}},textures:[],createdAt:`Tue, 30 May 2017 10:44:06 -0700`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Drop_Zone_Flicker`,paramsTypes:{frameRate:`float`,rgbOffset:`float`,blockAmount:`float`,ghostAmount:`float`,redCyan:`float`,scanline:`float`},defaultParams:{frameRate:24,rgbOffset:.014,blockAmount:.72,ghostAmount:.62,redCyan:.58,scanline:.075},glsl:`// Author: bread
// License: MIT
// Description: A flickering glitch with RGB offset, ghosting and scanlines that flashes back to the outgoing image
// Tags: glitch, flicker, chromatic, scanlines
// Drop_Zone_Flicker.glsl
// gl-transitions compatible: progress, ratio, getFromColor, getToColor
uniform float frameRate;    // = 24.0
uniform float rgbOffset;    // = 0.014
uniform float blockAmount;  // = 0.72
uniform float ghostAmount;  // = 0.62
uniform float redCyan;      // = 0.58
uniform float scanline;     // = 0.075

float sat(float x) {
  return clamp(x, 0.0, 1.0);
}

float hash12(vec2 p) {
  p = fract(p * vec2(443.8975, 397.2973));
  p += dot(p, p.yx + 19.19);
  return fract(p.x * p.y);
}

vec2 safeUv(vec2 uv) {
  return clamp(uv, vec2(0.001), vec2(0.999));
}

// 24fps reference-matched reveal curve.
// Non-monotonic on purpose: the reference flashes back to the old clip.
float frameReveal(float f) {
  if (f < 0.5) return 0.00;
  if (f < 1.5) return 0.28;
  if (f < 2.5) return 0.43;
  if (f < 3.5) return 0.46;
  if (f < 4.5) return 0.38;
  if (f < 5.5) return 0.48;
  if (f < 6.5) return 0.26;
  if (f < 7.5) return 0.10;
  if (f < 8.5) return 0.00;
  if (f < 9.5) return 0.00;
  if (f < 10.5) return 0.30;
  if (f < 11.5) return 0.58;
  if (f < 12.5) return 1.00;
  if (f < 13.5) return 0.70;
  if (f < 14.5) return 0.42;
  if (f < 15.5) return 0.55;
  if (f < 16.5) return 0.72;
  if (f < 17.5) return 0.88;
  if (f < 18.5) return 0.34;
  if (f < 19.5) return 0.48;
  if (f < 20.5) return 0.56;
  if (f < 21.5) return 0.76;
  if (f < 22.5) return 0.93;
  return 1.00;
}

float frameGlitch(float f) {
  if (f < 0.5) return 0.00;
  if (f < 6.5) return 0.92;
  if (f < 10.5) return 0.38;
  if (f < 11.5) return 0.78;
  if (f < 12.5) return 0.12;
  if (f < 17.5) return 0.74;
  if (f < 22.5) return 0.88;
  if (f < 23.5) return 0.28;
  return 0.00;
}

vec4 chromaFrom(vec2 uv, float amt) {
  vec2 o = vec2(amt, 0.0);
  return vec4(
    getFromColor(safeUv(uv + o)).r,
    getFromColor(safeUv(uv)).g,
    getFromColor(safeUv(uv - o)).b,
    1.0
  );
}

vec4 chromaTo(vec2 uv, float amt) {
  vec2 o = vec2(amt, 0.0);
  return vec4(
    getToColor(safeUv(uv - o)).r,
    getToColor(safeUv(uv)).g,
    getToColor(safeUv(uv + o)).b,
    1.0
  );
}

float blockMask(vec2 uv, float f) {
  vec2 big = floor(uv * vec2(4.0, 2.0));
  vec2 small = floor(uv * vec2(8.0, 4.0));

  float wide = step(0.48, hash12(vec2(big.x, f * 1.37)));
  float chunks = step(0.56, hash12(small + vec2(f * 2.11, f * 0.73)));

  float verticalCut = smoothstep(
    -0.035,
    0.035,
    uv.x - mix(0.18, 0.78, hash12(vec2(f, 4.7)))
  );

  return sat(mix(wide, chunks, 0.38) * 0.72 + verticalCut * 0.28);
}

vec4 transition(vec2 uv) {
  if (progress <= 0.0) return getFromColor(uv);
  if (progress >= 1.0) return getToColor(uv);

  float f = floor(progress * frameRate);
  float reveal = frameReveal(f);
  float glitch = frameGlitch(f);

  float rnd = hash12(vec2(f, 9.13));
  vec2 jitter = vec2(
    (rnd - 0.5) * 0.042,
    (hash12(vec2(f, 2.71)) - 0.5) * 0.010
  ) * glitch;

  vec2 fromUv = safeUv(uv + jitter);
  vec2 toUv = safeUv(uv - jitter * 0.55);

  float block = blockMask(uv, f);
  float localReveal = sat(
    reveal +
    (block - 0.5) * blockAmount * glitch +
    (hash12(vec2(f, floor(uv.y * 9.0))) - 0.5) * 0.18 * glitch
  );

  localReveal = smoothstep(0.22, 0.78, localReveal);

  vec4 oldClip = chromaFrom(fromUv, rgbOffset * glitch);
  vec4 newClip = chromaTo(toUv, rgbOffset * glitch);

  vec4 color = mix(oldClip, newClip, localReveal);

  float leftWash = (1.0 - smoothstep(0.10, 0.78, uv.x)) * glitch;
  float cyanWash = smoothstep(0.08, 0.62, uv.x) * (1.0 - smoothstep(0.86, 1.0, uv.x)) * glitch;

  vec3 redGhost = oldClip.rgb * vec3(1.34, 0.42, 0.38);
  vec3 cyanGhost = newClip.rgb * vec3(0.48, 1.12, 1.24);

  color.rgb = mix(color.rgb, redGhost, leftWash * redCyan * 0.42);
  color.rgb = mix(color.rgb, cyanGhost, cyanWash * redCyan * 0.30);

  // Keeps the old circular "drop zone" visible as a translucent flash,
  // especially after the first full new-frame hit.
  float oldReturn = glitch * (1.0 - smoothstep(0.94, 1.0, reveal));
  oldReturn *= 0.18 + 0.52 * (1.0 - abs(localReveal - 0.5) * 2.0);
  color.rgb = mix(color.rgb, oldClip.rgb, oldReturn * ghostAmount);

  float lines = sin((uv.y + f * 0.017) * 1080.0);
  color.rgb += lines * scanline * glitch;

  float exposurePulse = (hash12(vec2(f, 12.4)) - 0.35) * 0.10 * glitch;
  color.rgb += exposurePulse;

  return vec4(sat(color.r), sat(color.g), sat(color.b), 1.0);
}
`,author:`bread`,license:`MIT`,description:`A flickering glitch with RGB offset, ghosting and scanlines that flashes back to the outgoing image`,tags:[`glitch`,`flicker`,`chromatic`,`scanlines`],params:{frameRate:{type:`float`,default:24},rgbOffset:{type:`float`,default:.014},blockAmount:{type:`float`,default:.72},ghostAmount:{type:`float`,default:.62},redCyan:{type:`float`,default:.58},scanline:{type:`float`,default:.075}},textures:[],createdAt:`Wed, 10 Jun 2026 11:41:33 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`EdgeTransition`,paramsTypes:{edge_thickness:`float`,edge_brightness:`float`},defaultParams:{edge_thickness:.001,edge_brightness:8},glsl:`// Author: Woohyun Kim
// License: MIT
// Description: Both images fade through black with their edges glowing
// Tags: edges, fade

uniform float edge_thickness; // = 0.001
uniform float edge_brightness; // = 8.0

vec4 detectEdgeColor(vec3[9] c) {
  /* adjacent texel array for texel c[4]
    036
    147
    258
  */
  vec3 dx = 2.0 * abs(c[7]-c[1]) + abs(c[2] - c[6]) + abs(c[8] - c[0]);
	vec3 dy = 2.0 * abs(c[3]-c[5]) + abs(c[6] - c[8]) + abs(c[0] - c[2]);
  float delta = length(0.25 * (dx + dy) * 0.5);
	return vec4(clamp(edge_brightness * delta, 0.0, 1.0) * c[4], 1.0);
}

vec4 getFromEdgeColor(vec2 uv) {
	vec3 c[9];
	for (int i=0; i < 3; ++i) for (int j=0; j < 3; ++j)
	{
	  vec4 color = getFromColor(uv + edge_thickness * vec2(i-1,j-1));
    c[3*i + j] = color.rgb;
	}
	return detectEdgeColor(c);
}

vec4 getToEdgeColor(vec2 uv) {
	vec3 c[9];
	for (int i=0; i < 3; ++i) for (int j=0; j < 3; ++j)
	{
	  vec4 color = getToColor(uv + edge_thickness * vec2(i-1,j-1));
    c[3*i + j] = color.rgb;
	}
	return detectEdgeColor(c);
}

vec4 transition (vec2 uv) {
  vec4 start = mix(getFromColor(uv), getFromEdgeColor(uv), clamp(2.0 * progress, 0.0, 1.0));
  vec4 end = mix(getToEdgeColor(uv), getToColor(uv), clamp(2.0 * (progress - 0.5), 0.0, 1.0));
  return mix(
    start,
    end,
    progress
  );
}
`,author:`Woohyun Kim`,license:`MIT`,description:`Both images fade through black with their edges glowing`,tags:[`edges`,`fade`],params:{edge_thickness:{type:`float`,default:.001},edge_brightness:{type:`float`,default:8}},textures:[],createdAt:`Tue, 4 Apr 2023 16:28:18 +0900`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`FilmBurn`,paramsTypes:{Seed:`float`},defaultParams:{Seed:2.31},glsl:`// Author: Anastasia Dunbar
// License: MIT
// Description: Glowing film-burn light leaks wash over the image and reveal the incoming one
// Tags: burn, film, light-leak
// @param Random seed
uniform float Seed; // = 2.31
float sigmoid(float x, float a) {
    float b = pow(x*2.,a)/2.;
    if (x > .5) {
        b = 1.-pow(2.-(x*2.),a)/2.;
    }
	return b;
}
float rand(float co){
    return fract(sin((co*24.9898)+Seed)*43758.5453);
}
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
float apow(float a,float b) { return pow(abs(a),b)*sign(b); }
vec3 pow3(vec3 a,vec3 b) { return vec3(apow(a.r,b.r),apow(a.g,b.g),apow(a.b,b.b)); }
float smooth_mix(float a,float b,float c) { return mix(a,b,sigmoid(c,2.)); }
float random(vec2 co, float shft){
    co += 10.;
    return smooth_mix(fract(sin(dot(co.xy ,vec2(12.9898+(floor(shft)*.5),78.233+Seed))) * 43758.5453),fract(sin(dot(co.xy ,vec2(12.9898+(floor(shft+1.)*.5),78.233+Seed))) * 43758.5453),fract(shft));
}
float smooth_random(vec2 co, float shft) {
	return smooth_mix(smooth_mix(random(floor(co),shft),random(floor(co+vec2(1.,0.)),shft),fract(co.x)),smooth_mix(random(floor(co+vec2(0.,1.)),shft),random(floor(co+vec2(1.,1.)),shft),fract(co.x)),fract(co.y));
}
vec4 blendedColor(vec2 p) {
    return mix(getFromColor(p), getToColor(p), sigmoid(progress,10.));
}
#define pi 3.14159265358979323
#define clamps(x) clamp(x,0.,1.)

vec4 transition(vec2 p) {
  vec3 f = vec3(0.);
  for (float i = 0.; i < 13.; i++) {
    f += sin(((p.x*rand(i)*6.)+(progress*8.))+rand(i+1.43))*sin(((p.y*rand(i+4.4)*6.)+(progress*6.))+rand(i+2.4));
    f += 1.-clamps(length(p-vec2(smooth_random(vec2(progress*1.3),i+1.),smooth_random(vec2(progress*.5),i+6.25)))*mix(20.,70.,rand(i)));
  }
  f += 4.;
  f /= 11.;
  f = pow3(f*vec3(1.,0.7,0.6),vec3(1.,2.-sin(progress*pi),1.3));
  f *= sin(progress*pi);
  
  p -= .5;
  p *= 1.+(smooth_random(vec2(progress*5.),6.3)*sin(progress*pi)*.05);
  p += .5;
  
  vec4 blurred_image = vec4(0.);
  float bluramount = sin(progress*pi)*.03;
  #define repeats  50.
  for (float i = 0.; i < repeats; i++) { 
      vec2 q = vec2(cos(degrees((i/repeats)*360.)),sin(degrees((i/repeats)*360.))) *  (rand(vec2(i,p.x+p.y))+bluramount); 
      vec2 uv2 = p+(q*bluramount);
      blurred_image += blendedColor(uv2);
  }
  blurred_image /= repeats;
  
  return blurred_image+vec4(f,0.);
}
`,author:`Anastasia Dunbar`,license:`MIT`,description:`Glowing film-burn light leaks wash over the image and reveal the incoming one`,tags:[`burn`,`film`,`light-leak`],params:{Seed:{type:`float`,default:2.31,description:`Random seed`}},textures:[],createdAt:`Wed, 21 Feb 2018 20:52:13 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Fold`,paramsTypes:{},defaultParams:{},glsl:`// Author: nwoeanhinnogaehr
// License: MIT
// Description: The incoming image unfolds from the left while the outgoing one folds away to the right
// Tags: fold, slide, horizontal
// Ported from https://gist.github.com/nwoeanhinnogaehr/f6fc39f4cfcbb97f96a6

vec4 transition(vec2 uv) {
  // Only sample the visible side: the other one divides by zero at progress 0 and 1.
  if (progress == 0.0 || uv.x > progress) return getFromColor((uv - vec2(progress, 0.0)) / vec2(1.0 - progress, 1.0));
  return getToColor(uv / vec2(progress, 1.0));
}
`,author:`nwoeanhinnogaehr`,license:`MIT`,description:`The incoming image unfolds from the left while the outgoing one folds away to the right`,tags:[`fold`,`slide`,`horizontal`],params:{},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Sat, 10 Oct 2026 11:26:01 +0200`},{name:`GlitchDisplace`,paramsTypes:{},defaultParams:{},glsl:`// Author: Matt DesLauriers
// License: MIT
// Description: Blocks of the image are displaced in a glitch that flashes into the incoming image
// Tags: glitch, displace

float random(vec2 co)
{
    float a = 12.9898;
    float b = 78.233;
    float c = 43758.5453;
    float dt= dot(co.xy ,vec2(a,b));
    float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}
float voronoi( in vec2 x ) {
    vec2 p = floor( x );
    vec2 f = fract( x );
    float res = 8.0;
    for( float j=-1.; j<=1.; j++ )
    for( float i=-1.; i<=1.; i++ ) {
        vec2  b = vec2( i, j );
        vec2  r = b - f + random( p + b );
        float d = dot( r, r );
        res = min( res, d );
    }
    return sqrt( res );
}

vec2 displace(vec4 tex, vec2 texCoord, float dotDepth, float textureDepth, float strength) {
    float b = voronoi(.003 * texCoord + 2.0);
    float g = voronoi(0.2 * texCoord);
    float r = voronoi(texCoord - 1.0);
    vec4 dt = tex * 1.0;
    vec4 dis = dt * dotDepth + 1.0 - tex * textureDepth;

    dis.x = dis.x - 1.0 + textureDepth*dotDepth;
    dis.y = dis.y - 1.0 + textureDepth*dotDepth;
    dis.x *= strength;
    dis.y *= strength;
    vec2 res_uv = texCoord ;
    res_uv.x = res_uv.x + dis.x - 0.0;
    res_uv.y = res_uv.y + dis.y;
    return res_uv;
}

float ease1(float t) {
  return t == 0.0 || t == 1.0
    ? t
    : t < 0.5
      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}
float ease2(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}



vec4 transition(vec2 uv) {
  vec2 p = uv.xy / vec2(1.0).xy;
  vec4 color1 = getFromColor(p);
  vec4 color2 = getToColor(p);
  vec2 disp = displace(color1, p, 0.33, 0.7, 1.0-ease1(progress));
  vec2 disp2 = displace(color2, p, 0.33, 0.5, ease2(progress));
  vec4 dColor1 = getToColor(disp);
  vec4 dColor2 = getFromColor(disp2);
  float val = ease1(progress);
  vec3 gray = vec3(dot(min(dColor2, dColor1).rgb, vec3(0.299, 0.587, 0.114)));
  dColor2 = vec4(gray, 1.0);
  dColor2 *= 2.0;
  color1 = mix(color1, dColor2, smoothstep(0.0, 0.5, progress));
  color2 = mix(color2, dColor1, smoothstep(1.0, 0.5, progress));
  return mix(color1, color2, val);
  //gl_FragColor = mix(gl_FragColor, dColor, smoothstep(0.0, 0.5, progress));

   //gl_FragColor = mix(texture2D(from, p), texture2D(to, p), progress);
}
`,author:`Matt DesLauriers`,license:`MIT`,description:`Blocks of the image are displaced in a glitch that flashes into the incoming image`,tags:[`glitch`,`displace`],params:{},textures:[],createdAt:`Tue, 30 May 2017 14:53:04 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`GlitchMemories`,paramsTypes:{},defaultParams:{},glsl:`// Author: Gunnar Roth
// based on work from natewave
// License: MIT
// Description: A crossfade with glitchy, color-shifted blocks
// Tags: glitch, chromatic, blend
vec4 transition(vec2 p) {
  vec2 block = floor(p.xy / vec2(16));
  vec2 uv_noise = block / vec2(64);
  uv_noise += floor(vec2(progress) * vec2(1200.0, 3500.0)) / vec2(64);
  vec2 dist = progress > 0.0 ? (fract(uv_noise) - 0.5) * 0.3 *(1.0 -progress) : vec2(0.0);
  vec2 red = p + dist * 0.2;
  vec2 green = p + dist * .3;
  vec2 blue = p + dist * .5;

  return vec4(mix(getFromColor(red), getToColor(red), progress).r,mix(getFromColor(green), getToColor(green), progress).g,mix(getFromColor(blue), getToColor(blue), progress).b,1.0);
}

`,author:`Gunnar Roth`,license:`MIT`,description:`A crossfade with glitchy, color-shifted blocks`,tags:[`glitch`,`chromatic`,`blend`],params:{},textures:[],createdAt:`Wed, 21 Feb 2018 00:52:15 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`GridFlip`,paramsTypes:{size:`ivec2`,pause:`float`,dividerWidth:`float`,bgcolor:`vec4`,randomness:`float`},defaultParams:{size:[4,4],pause:.1,dividerWidth:.05,bgcolor:[0,0,0,1],randomness:.1},glsl:`// License: MIT
// Author: TimDonselaar
// Description: The image splits into a grid of tiles that flip one by one to the incoming image
// Tags: grid, tiles, flip
// ported by gre from https://gist.github.com/TimDonselaar/9bcd1c4b5934ba60087bdb55c2ea92e5

// @param Number of tiles (columns, rows)
uniform ivec2 size; // = ivec2(4)
uniform float pause; // = 0.1
uniform float dividerWidth; // = 0.05
// @color Color behind the tiles
uniform vec4 bgcolor; // = vec4(0.0, 0.0, 0.0, 1.0)
uniform float randomness; // = 0.1
 
float rand (vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float getDelta(vec2 p) {
  vec2 rectanglePos = floor(vec2(size) * p);
  vec2 rectangleSize = vec2(1.0 / vec2(size).x, 1.0 / vec2(size).y);
  float top = rectangleSize.y * (rectanglePos.y + 1.0);
  float bottom = rectangleSize.y * rectanglePos.y;
  float left = rectangleSize.x * rectanglePos.x;
  float right = rectangleSize.x * (rectanglePos.x + 1.0);
  float minX = min(abs(p.x - left), abs(p.x - right));
  float minY = min(abs(p.y - top), abs(p.y - bottom));
  return min(minX, minY);
}

float getDividerSize() {
  vec2 rectangleSize = vec2(1.0 / vec2(size).x, 1.0 / vec2(size).y);
  return min(rectangleSize.x, rectangleSize.y) * dividerWidth;
}

vec4 transition(vec2 p) {
  if(progress < pause) {
    float currentProg = progress / pause;
    float a = 1.0;
    if(getDelta(p) < getDividerSize()) {
      a = 1.0 - currentProg;
    }
    return mix(bgcolor, getFromColor(p), a);
  }
  else if(progress < 1.0 - pause){
    if(getDelta(p) < getDividerSize()) {
      return bgcolor;
    } else {
      float currentProg = (progress - pause) / (1.0 - pause * 2.0);
      vec2 q = p;
      vec2 rectanglePos = floor(vec2(size) * q);
      
      float r = rand(rectanglePos) - randomness;
      float cp = smoothstep(0.0, 1.0 - r, currentProg);
    
      float rectangleSize = 1.0 / vec2(size).x;
      float delta = rectanglePos.x * rectangleSize;
      float offset = rectangleSize / 2.0 + delta;
      
      p.x = (p.x - offset)/abs(cp - 0.5)*0.5 + offset;
      vec4 a = getFromColor(p);
      vec4 b = getToColor(p);
      
      float s = step(abs(vec2(size).x * (q.x - delta) - 0.5), abs(cp - 0.5));
      return mix(bgcolor, mix(b, a, step(cp, 0.5)), s);
    }
  }
  else {
    float currentProg = (progress - 1.0 + pause) / pause;
    float a = 1.0;
    if(getDelta(p) < getDividerSize()) {
      a = currentProg;
    }
    return mix(bgcolor, getToColor(p), a);
  }
}
`,author:`TimDonselaar`,license:`MIT`,description:`The image splits into a grid of tiles that flip one by one to the incoming image`,tags:[`grid`,`tiles`,`flip`],params:{size:{type:`ivec2`,default:[4,4],description:`Number of tiles (columns, rows)`},pause:{type:`float`,default:.1},dividerWidth:{type:`float`,default:.05},bgcolor:{type:`vec4`,default:[0,0,0,1],color:!0,description:`Color behind the tiles`},randomness:{type:`float`,default:.1}},textures:[],createdAt:`Mon, 12 Jun 2017 11:32:51 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`HSVfade`,paramsTypes:{},defaultParams:{},glsl:`// Author: nwoeanhinnogaehr
// License: MIT
// Description: A crossfade through the HSV color space that cycles through hues
// Tags: fade, color, hue
// Ported from https://gist.github.com/nwoeanhinnogaehr/b185145363d65751009b

// HSV functions from http://lolengine.net/blog/2013/07/27/rgb-to-hsv-in-glsl

vec3 hsv2rgb(vec3 c) {
  const vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 c) {
  const vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 0.001)), d / (q.x + 0.001), q.x);
}

vec4 transition(vec2 uv) {
  vec3 a = rgb2hsv(getFromColor(uv).rgb);
  vec3 b = rgb2hsv(getToColor(uv).rgb);
  vec3 m = mix(a, b, progress);
  return vec4(hsv2rgb(m), 1.0);
}
`,author:`nwoeanhinnogaehr`,license:`MIT`,description:`A crossfade through the HSV color space that cycles through hues`,tags:[`fade`,`color`,`hue`],params:{},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`HorizontalClose`,paramsTypes:{},defaultParams:{},glsl:`// Author: martiniti
// License: MIT
// Description: The incoming image closes in from the top and bottom edges toward the middle
// Tags: wipe, split

vec4 transition (vec2 uv) {

  float s = 2.0 - abs((uv.y - 0.5) / (progress - 1.0)) - 2.0 * progress;
  
  return mix(
    getFromColor(uv),
    getToColor(uv),
    smoothstep(0.5, 0.0, s)
  ); 
}
`,author:`martiniti`,license:`MIT`,description:`The incoming image closes in from the top and bottom edges toward the middle`,tags:[`wipe`,`split`],params:{},textures:[],createdAt:`Tue, 4 Apr 2023 10:35:23 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`HorizontalOpen`,paramsTypes:{},defaultParams:{},glsl:`// Author: martiniti
// License: MIT
// Description: The incoming image opens from a line in the middle toward the top and bottom edges
// Tags: wipe, split

vec4 transition (vec2 uv) {
  
  float regress = 1.0 - progress;

  float s = 2.0 - abs((uv.y - 0.5) / (regress - 1.0)) - 2.0 * regress;
  
  return mix(
    getFromColor(uv),
    getToColor(uv),
    smoothstep(0.0, 0.5, s)
  );
}
`,author:`martiniti`,license:`MIT`,description:`The incoming image opens from a line in the middle toward the top and bottom edges`,tags:[`wipe`,`split`],params:{},textures:[],createdAt:`Tue, 4 Apr 2023 10:35:30 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`InvertedPageCurl`,paramsTypes:{},defaultParams:{},glsl:`// Author: Hewlett-Packard
// License: BSD 3 Clause
// Description: The outgoing image curls away like a page, revealing the incoming one
// Tags: page, curl, 3d
// Adapted by Sergey Kosarevsky from:
// http://rectalogic.github.io/webvfx/examples_2transition-shader-pagecurl_8html-example.html

/*
Copyright (c) 2010 Hewlett-Packard Development Company, L.P. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

   * Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above
     copyright notice, this list of conditions and the following disclaimer
     in the documentation and/or other materials provided with the
     distribution.
   * Neither the name of Hewlett-Packard nor the names of its
     contributors may be used to endorse or promote products derived from
     this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
in vec2 texCoord;
*/

const float MIN_AMOUNT = -0.16;
const float MAX_AMOUNT = 1.5;

const float PI = 3.141592653589793;

const float scale = 512.0;
const float sharpness = 3.0;

const float cylinderRadius = 1.0 / PI / 2.0;

// These depend on the progress uniform and must be computed per-fragment.
// Global initializers with uniforms are invalid in GLSL ES and fail on Mesa.
float amount;
float cylinderCenter;
float cylinderAngle;

vec3 hitPoint(float hitAngle, float yc, vec3 point, mat3 rrotation)
{
        float hitPoint = hitAngle / (2.0 * PI);
        point.y = hitPoint;
        return rrotation * point;
}

vec4 antiAlias(vec4 color1, vec4 color2, float distanc)
{
        distanc *= scale;
        if (distanc < 0.0) return color2;
        if (distanc > 2.0) return color1;
        float dd = pow(1.0 - distanc / 2.0, sharpness);
        return ((color2 - color1) * dd) + color1;
}

float distanceToEdge(vec3 point)
{
        float dx = abs(point.x > 0.5 ? 1.0 - point.x : point.x);
        float dy = abs(point.y > 0.5 ? 1.0 - point.y : point.y);
        if (point.x < 0.0) dx = -point.x;
        if (point.x > 1.0) dx = point.x - 1.0;
        if (point.y < 0.0) dy = -point.y;
        if (point.y > 1.0) dy = point.y - 1.0;
        if ((point.x < 0.0 || point.x > 1.0) && (point.y < 0.0 || point.y > 1.0)) return sqrt(dx * dx + dy * dy);
        return min(dx, dy);
}

vec4 seeThrough(float yc, vec2 p, mat3 rotation, mat3 rrotation)
{
        float hitAngle = PI - (acos(clamp(yc / cylinderRadius, -1.0, 1.0)) - cylinderAngle);
        vec3 point = hitPoint(hitAngle, yc, rotation * vec3(p, 1.0), rrotation);
        if (yc <= 0.0 && (point.x < 0.0 || point.y < 0.0 || point.x > 1.0 || point.y > 1.0))
        {
            return getToColor(p);
        }

        if (yc > 0.0) return getFromColor(p);

        vec4 color = getFromColor(point.xy);
        vec4 tcolor = vec4(0.0);

        return antiAlias(color, tcolor, distanceToEdge(point));
}

vec4 seeThroughWithShadow(float yc, vec2 p, vec3 point, mat3 rotation, mat3 rrotation)
{
        float shadow = distanceToEdge(point) * 30.0;
        shadow = (1.0 - shadow) / 3.0;

        if (shadow < 0.0) shadow = 0.0; else shadow *= amount;

        vec4 shadowColor = seeThrough(yc, p, rotation, rrotation);
        shadowColor.r -= shadow;
        shadowColor.g -= shadow;
        shadowColor.b -= shadow;

        return shadowColor;
}

vec4 backside(float yc, vec3 point)
{
        vec4 color = getFromColor(point.xy);
        float gray = (color.r + color.b + color.g) / 15.0;
        gray += (8.0 / 10.0) * (pow(max(0.0, 1.0 - abs(yc / cylinderRadius)), 2.0 / 10.0) / 2.0 + (5.0 / 10.0));
        color.rgb = vec3(gray);
        return color;
}

vec4 behindSurface(vec2 p, float yc, vec3 point, mat3 rrotation)
{
        float safeAmount = amount >= 0.0 ? max(amount, 1e-4) : min(amount, -1e-4);
        float shado = (1.0 - ((-cylinderRadius - yc) / safeAmount * 7.0)) / 6.0;
        shado *= 1.0 - abs(point.x - 0.5);

        yc = (-cylinderRadius - cylinderRadius - yc);

        float hitAngle = (acos(clamp(yc / cylinderRadius, -1.0, 1.0)) + cylinderAngle) - PI;
        point = hitPoint(hitAngle, yc, point, rrotation);

        if (yc < 0.0 && point.x >= 0.0 && point.y >= 0.0 && point.x <= 1.0 && point.y <= 1.0 && (hitAngle < PI || amount > 0.5))
        {
                float dx = point.x - 0.5;
                float dy = point.y - 0.5;
                shado = 1.0 - (sqrt(dx * dx + dy * dy) / (71.0 / 100.0));
                float nyc = -yc / cylinderRadius;
                shado *= nyc * nyc * nyc;
                shado *= 0.5;
        }
        else
        {
                shado = 0.0;
        }
        return vec4(getToColor(p).rgb - shado, 1.0);
}

vec4 transition(vec2 p) {
  amount = progress * (MAX_AMOUNT - MIN_AMOUNT) + MIN_AMOUNT;
  cylinderCenter = amount;
  cylinderAngle = 2.0 * PI * amount;

  const float angle = 100.0 * PI / 180.0;
        float c = cos(-angle);
        float s = sin(-angle);

        mat3 rotation = mat3( c, s, 0,
                                                                -s, c, 0,
                                                                -0.801, 0.8900, 1
                                                                );
        c = cos(angle);
        s = sin(angle);

        mat3 rrotation = mat3(	c, s, 0,
                                                                        -s, c, 0,
                                                                        0.98500, 0.985, 1
                                                                );

        vec3 point = rotation * vec3(p, 1.0);

        float yc = point.y - cylinderCenter;

        if (yc < -cylinderRadius)
        {
                // Behind surface
                return behindSurface(p,yc, point, rrotation);
        }

        if (yc > cylinderRadius)
        {
                // Flat surface
                return getFromColor(p);
        }

        float hitAngle = (acos(clamp(yc / cylinderRadius, -1.0, 1.0)) + cylinderAngle) - PI;

        float hitAngleMod = mod(hitAngle, 2.0 * PI);
        if ((hitAngleMod > PI && amount < 0.5) || (hitAngleMod > PI/2.0 && amount < 0.0))
        {
                return seeThrough(yc, p, rotation, rrotation);
        }

        point = hitPoint(hitAngle, yc, point, rrotation);

        if (point.x < 0.0 || point.y < 0.0 || point.x > 1.0 || point.y > 1.0)
        {
                return seeThroughWithShadow(yc, p, point, rotation, rrotation);
        }

        vec4 color = backside(yc, point);

        vec4 otherColor;
        if (yc < 0.0)
        {
                float dx2 = point.x - 0.5;
                float dy2 = point.y - 0.5;
                float shado = 1.0 - (sqrt(dx2 * dx2 + dy2 * dy2) / 0.71);
                float nyc2 = -yc / cylinderRadius;
                shado *= nyc2 * nyc2 * nyc2;
                shado *= 0.5;
                otherColor = vec4(0.0, 0.0, 0.0, shado);
        }
        else
        {
                otherColor = getFromColor(p);
        }

        color = antiAlias(color, otherColor, cylinderRadius - abs(yc));

        vec4 cl = seeThroughWithShadow(yc, p, point, rotation, rrotation);
        float dist = distanceToEdge(point);

        return antiAlias(color, cl, dist);
}
`,author:`Hewlett-Packard`,license:`BSD 3 Clause`,description:`The outgoing image curls away like a page, revealing the incoming one`,tags:[`page`,`curl`,`3d`],params:{},textures:[],createdAt:`Wed, 21 Feb 2018 01:13:49 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`LeftRight`,paramsTypes:{},defaultParams:{},glsl:`// Author: zhmy
// License: MIT
// Description: The outgoing image shrinks away to the left while the incoming one slides in from the right
// Tags: slide, zoom, horizontal

const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
    return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
    vec2 spfr,spto = vec2(-1.);

    float size = mix(1.0, 3.0, progress*0.2);
    spto = (uv + vec2(-0.5,-0.5))*vec2(size,size)+vec2(0.5,0.5);
    spfr = (uv - vec2(1.-progress, 0.0));
    if(inBounds(spfr)){
        return getToColor(spfr);
    }else if(inBounds(spto)){
        return getFromColor(spto) * (1.0 - progress);
    } else{
        return black;
    }
}`,author:`zhmy`,license:`MIT`,description:`The outgoing image shrinks away to the left while the incoming one slides in from the right`,tags:[`slide`,`zoom`,`horizontal`],params:{},textures:[],createdAt:`Thu, 17 Dec 2020 11:50:34 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`LinearBlur`,paramsTypes:{intensity:`float`},defaultParams:{intensity:.1},glsl:`// Author: gre
// License: MIT
// Description: A crossfade through a blur
// Tags: blur, blend
// @param Amount of blur
uniform float intensity; // = 0.1
const int passes = 6;

vec4 transition(vec2 uv) {
    vec4 c1 = vec4(0.0);
    vec4 c2 = vec4(0.0);

    float disp = intensity*(0.5-distance(0.5, progress));
    for (int xi=0; xi<passes; xi++)
    {
        float x = float(xi) / float(passes) - 0.5;
        for (int yi=0; yi<passes; yi++)
        {
            float y = float(yi) / float(passes) - 0.5;
            vec2 v = vec2(x,y);
            float d = disp;
            c1 += getFromColor( uv + d*v);
            c2 += getToColor( uv + d*v);
        }
    }
    c1 /= float(passes*passes);
    c2 /= float(passes*passes);
    return mix(c1, c2, progress);
}
`,author:`gre`,license:`MIT`,description:`A crossfade through a blur`,tags:[`blur`,`blend`],params:{intensity:{type:`float`,default:.1,description:`Amount of blur`}},textures:[],createdAt:`Fri, 23 Feb 2018 15:18:22 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Mosaic`,paramsTypes:{endx:`int`,endy:`int`},defaultParams:{endx:2,endy:-1},glsl:`// License: MIT
// Author: Xaychru
// Description: The view pans across a mosaic of rotated tiles from both images and settles on the incoming one
// Tags: mosaic, tiles, zoom
// ported by gre from https://gist.github.com/Xaychru/130bb7b7affedbda9df5

#define PI 3.14159265358979323
#define POW2(X) X*X
#define POW3(X) X*X*X
uniform int endx; // = 2
uniform int endy; // = -1

float Rand(vec2 v) {
  return fract(sin(dot(v.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
vec2 Rotate(vec2 v, float a) {
  mat2 rm = mat2(cos(a), -sin(a),
                 sin(a), cos(a));
  return rm*v;
}
float CosInterpolation(float x) {
  return -cos(x*PI)/2.+.5;
}
vec4 transition(vec2 uv) {
  vec2 p = uv.xy / vec2(1.0).xy - .5;
  vec2 rp = p;
  float rpr = (progress*2.-1.);
  float z = -(rpr*rpr*2.) + 3.;
  float az = abs(z);
  rp *= az;
  rp += mix(vec2(.5, .5), vec2(float(endx) + .5, float(endy) + .5), POW2(CosInterpolation(progress)));
  vec2 mrp = mod(rp, 1.);
  vec2 crp = rp;
  bool onEnd = int(floor(crp.x))==endx&&int(floor(crp.y))==endy;
  if(!onEnd) {
    float ang = float(int(Rand(floor(crp))*4.))*.5*PI;
    mrp = vec2(.5) + Rotate(mrp-vec2(.5), ang);
  }
  if(onEnd || Rand(floor(crp))>.5) {
    return getToColor(mrp);
  } else {
    return getFromColor(mrp);
  }
}
`,author:`Xaychru`,license:`MIT`,description:`The view pans across a mosaic of rotated tiles from both images and settles on the incoming one`,tags:[`mosaic`,`tiles`,`zoom`],params:{endx:{type:`int`,default:2},endy:{type:`int`,default:-1}},textures:[],createdAt:`Mon, 12 Jun 2017 10:26:51 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Overexposure`,paramsTypes:{strength:`float`},defaultParams:{strength:.6},glsl:`// Author: Ben Zhang
// License: MIT
// Description: A crossfade through a washed-out, overexposed white
// Tags: flash, light, fade

// @param Amount of overexposure
uniform float strength; // = 0.6
const float PI = 3.141592653589793;

vec4 transition (vec2 uv) {
  vec4 from = getFromColor(uv);
  vec4 to = getToColor(uv);

  // Multipliers
  float from_m = 1.0 - progress + sin(PI * progress) * strength;
  float to_m = progress + sin(PI * progress) * strength;
  
  return vec4(
    from.r * from.a * from_m + to.r * to.a * to_m,
    from.g * from.a * from_m + to.g * to.a * to_m,
    from.b * from.a * from_m + to.b * to.a * to_m,
    mix(from.a, to.a, progress)
  );
}
`,author:`Ben Zhang`,license:`MIT`,description:`A crossfade through a washed-out, overexposed white`,tags:[`flash`,`light`,`fade`],params:{strength:{type:`float`,default:.6,description:`Amount of overexposure`}},textures:[],createdAt:`Tue, 15 Mar 2022 20:21:15 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`PolkaDotsCurtain`,paramsTypes:{dots:`float`,center:`vec2`},defaultParams:{dots:20,center:[0,0]},glsl:`// Author: bobylito
// License: MIT
// Description: The incoming image appears through growing polka dots
// Tags: dots, pattern
const float SQRT_2 = 1.414213562373;
// @param Number of dots across the image
uniform float dots; // = 20.0
uniform vec2 center; // = vec2(0, 0)

vec4 transition(vec2 uv) {
  bool nextImage = distance(fract(uv * dots), vec2(0.5, 0.5)) < ( progress / distance(uv, center));
  return nextImage ? getToColor(uv) : getFromColor(uv);
}
`,author:`bobylito`,license:`MIT`,description:`The incoming image appears through growing polka dots`,tags:[`dots`,`pattern`],params:{dots:{type:`float`,default:20,description:`Number of dots across the image`},center:{type:`vec2`,default:[0,0]}},textures:[],createdAt:`Tue, 20 Feb 2018 23:41:45 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`PuzzleRight`,paramsTypes:{size:`ivec2`,pause:`float`,dividerWidth:`float`},defaultParams:{size:[4,4],pause:.1,dividerWidth:.005},glsl:`// Author: JustKirillS
// License: MIT
// Description: The image splits into a grid of tiles that flip one by one to the incoming image
// Tags: grid, tiles, flip
// Ported from https://gist.github.com/JustKirillS/714f095318834f4d2375de872c53af1e

uniform ivec2 size; // = ivec2(4, 4)
uniform float pause; // = 0.1
uniform float dividerWidth; // = 0.005

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float getDelta(vec2 p) {
  vec2 rectangleSize = 1.0 / vec2(size);
  vec2 rectanglePos = floor(vec2(size) * p);
  float top = rectangleSize.y * (rectanglePos.y + 1.0);
  float bottom = rectangleSize.y * rectanglePos.y;
  float left = rectangleSize.x * rectanglePos.x;
  float right = rectangleSize.x * (rectanglePos.x + 1.0);
  float minX = min(abs(p.x - left), abs(p.x - right));
  float minY = min(abs(p.y - top), abs(p.y - bottom));
  return min(minX, minY);
}

vec4 transition(vec2 uv) {
  if (progress < pause) {
    float currentProg = progress / pause;
    float a = 1.0;
    if (getDelta(uv) < dividerWidth) { a = 1.0 - currentProg; }
    return mix(vec4(0.0, 0.0, 0.0, 1.0), getFromColor(uv), a);
  } else if (progress < 1.0 - pause) {
    if (getDelta(uv) < dividerWidth) {
      return vec4(0.0, 0.0, 0.0, 1.0);
    }
    float currentProg = (progress - pause) / (1.0 - pause * 2.0);
    vec2 rectanglePos = floor(vec2(size) * uv);
    float r = rand(rectanglePos) - 0.1;
    float cp = smoothstep(0.0, 1.0 - r, currentProg);
    float rectangleSize = 1.0 / float(size.x);
    float delta = rectanglePos.x * rectangleSize;
    float offset = rectangleSize / 2.0 + delta;
    vec2 p = uv;
    p.x = (p.x - offset) / abs(cp - 0.5) * 0.5 + offset;
    vec4 a = getFromColor(p);
    vec4 b = getToColor(p);
    float s = step(abs(float(size.x) * (uv.x - delta) - 0.5), abs(cp - 0.5));
    return vec4(mix(b, a, step(cp, 0.5)).rgb * s, 1.0);
  } else {
    float currentProg = (progress - 1.0 + pause) / pause;
    float a = 1.0;
    if (getDelta(uv) < dividerWidth) { a = currentProg; }
    return mix(vec4(0.0, 0.0, 0.0, 1.0), getToColor(uv), a);
  }
}
`,author:`JustKirillS`,license:`MIT`,description:`The image splits into a grid of tiles that flip one by one to the incoming image`,tags:[`grid`,`tiles`,`flip`],params:{size:{type:`ivec2`,default:[4,4]},pause:{type:`float`,default:.1},dividerWidth:{type:`float`,default:.005}},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`Radial`,paramsTypes:{smoothness:`float`},defaultParams:{smoothness:1},glsl:`// License: MIT
// Author: Xaychru
// Description: A radial wipe that sweeps around the center like a clock hand
// Tags: wipe, radial, clock
// ported by gre from https://gist.github.com/Xaychru/ce1d48f0ce00bb379750

uniform float smoothness; // = 1.0

const float PI = 3.141592653589;

vec4 transition(vec2 p) {
  vec2 rp = p*2.-1.;
  return mix(
    getToColor(p),
    getFromColor(p),
    smoothstep(0., smoothness, atan(rp.y,rp.x) - (progress-.5) * PI * 2.5)
  );
}
`,author:`Xaychru`,license:`MIT`,description:`A radial wipe that sweeps around the center like a clock hand`,tags:[`wipe`,`radial`,`clock`],params:{smoothness:{type:`float`,default:1}},textures:[],createdAt:`Mon, 12 Jun 2017 10:36:24 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Rectangle`,paramsTypes:{bgcolor:`vec4`},defaultParams:{bgcolor:[0,0,0,1]},glsl:`// Author: martiniti
// License: MIT
// Description: A rectangle grows from the center to cover the outgoing image, then shrinks to reveal the incoming one
// Tags: box, shape, iris

// @color Color of the rectangle
uniform vec4 bgcolor; // = vec4(0.0, 0.0, 0.0, 1.0)

vec4 transition(vec2 p) {
  float s = pow(2.0 * abs(progress - 0.5), 3.0);
  
   vec2 sq = p.xy / vec2(1.0).xy;
   
    // bottom-left
    vec2 bl = step(vec2(abs(1. - 2.*progress)), sq + .25);
    float dist = bl.x * bl.y;

    // top-right
    vec2 tr = step(vec2(abs(1. - 2.*progress)), 1.25-sq);
    dist *= 1. * tr.x * tr.y;
  
  return mix(
    progress < 0.5 ? getFromColor(p) : getToColor(p),
    bgcolor,
    step(s, dist)
  );
  
}
`,author:`martiniti`,license:`MIT`,description:`A rectangle grows from the center to cover the outgoing image, then shrinks to reveal the incoming one`,tags:[`box`,`shape`,`iris`],params:{bgcolor:{type:`vec4`,default:[0,0,0,1],color:!0,description:`Color of the rectangle`}},textures:[],createdAt:`Tue, 4 Apr 2023 10:29:59 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`RectangleCrop`,paramsTypes:{bgcolor:`vec4`},defaultParams:{bgcolor:[0,0,0,1]},glsl:`// License: MIT
// Author: martiniti
// Description: The outgoing image shrinks into a small rectangle over a background color, then the incoming one grows from it
// Tags: box, iris, zoom

// @color Background color
uniform vec4 bgcolor; // = vec4(0.0, 0.0, 0.0, 1.0)

vec4 transition(vec2 uv) {
  
  float s = pow(2.0 * abs(progress - 0.5), 3.0);
              
  vec2 q = uv.xy / vec2(1.0).xy;
  
  // bottom-left
  vec2 bl = step(vec2(1.0 - 2.0*abs(progress - 0.5)), q + 0.25);
  
  // top-right
  vec2 tr = step(vec2(1.0 - 2.0*abs(progress - 0.5)), 1.25 - q);
  
  float dist = length(1.0 - bl.x * bl.y * tr.x * tr.y);
  
  return mix(
    progress < 0.5 ? getFromColor(uv) : getToColor(uv),
    bgcolor,
    step(s, dist)
  );
  
}
`,author:`martiniti`,license:`MIT`,description:`The outgoing image shrinks into a small rectangle over a background color, then the incoming one grows from it`,tags:[`box`,`iris`,`zoom`],params:{bgcolor:{type:`vec4`,default:[0,0,0,1],color:!0,description:`Background color`}},textures:[],createdAt:`Tue, 4 Apr 2023 10:30:36 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Revolve_Left`,paramsTypes:{center:`vec2`,direction:`float`,maxRotation:`float`,peakZoom:`float`,swirl:`float`,barrel:`float`,motionBlur:`float`,switchStart:`float`,switchEnd:`float`,shadow:`float`},defaultParams:{center:[.46,.52],direction:-1,maxRotation:1.95,peakZoom:2.22,swirl:2.85,barrel:.38,motionBlur:1,switchStart:.3,switchEnd:.5,shadow:.16},glsl:`// Author: bread
// License: MIT
// Description: The outgoing image swirls and zooms with motion blur into the incoming one
// Tags: swirl, zoom, rotate, blur
// gl-transitions v1 compatible

// @param Center of the swirl
uniform vec2 center;       // = vec2(0.46, 0.52)
uniform float direction;   // = -1.0
uniform float maxRotation; // = 1.95
uniform float peakZoom;    // = 2.22
uniform float swirl;       // = 2.85
uniform float barrel;      // = 0.38
uniform float motionBlur;  // = 1.0
uniform float switchStart; // = 0.30
uniform float switchEnd;   // = 0.50
uniform float shadow;      // = 0.16

float sat(float x) {
  return clamp(x, 0.0, 1.0);
}

float ease(float x) {
  x = sat(x);
  return x * x * (3.0 - 2.0 * x);
}

float revolveEnvelope(float t) {
  float rise = ease((t - 0.10) / 0.33);
  float fall = 1.0 - ease((t - 0.43) / 0.29);
  return rise * fall;
}

vec2 rotate2(vec2 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 warpUv(vec2 uv, float t) {
  float e = revolveEnvelope(t);

  vec2 p = uv - center;
  p.x *= ratio;

  float r = length(p);
  float edgeSpin = maxRotation * e;
  float coreSpin = swirl * e * pow(1.0 - sat(r / 0.96), 1.55);
  float visibleAngle = direction * (edgeSpin + coreSpin);

  p = rotate2(p, -visibleAngle);

  float sc = 1.0 + (peakZoom - 1.0) * pow(e, 0.85);
  p /= sc;

  float rr = length(p);
  p *= 1.0 + barrel * e * rr * rr * 2.8;

  p.x /= ratio;
  return clamp(p + center, vec2(0.001), vec2(0.999));
}

vec4 sampleRevolve(vec2 uv, float t) {
  vec2 p = warpUv(uv, t);
  float reveal = smoothstep(switchStart, switchEnd, t);
  return mix(getFromColor(p), getToColor(p), reveal);
}

vec4 transition(vec2 uv) {
  if (progress <= 0.0) return getFromColor(uv);
  if (progress >= 1.0) return getToColor(uv);

  float e = revolveEnvelope(progress);
  float span = 0.060 * motionBlur * e;

  vec4 color = vec4(0.0);
  float total = 0.0;

  for (int i = -8; i <= 8; i++) {
    float x = float(i) / 8.0;
    float w = 1.0 - abs(x);
    w = w * w + 0.01;

    float t = sat(progress + x * span);
    color += sampleRevolve(uv, t) * w;
    total += w;
  }

  color /= total;

  vec2 q = uv - vec2(0.5);
  q.x *= ratio;
  float vignette = 1.0 - shadow * e * smoothstep(0.35, 0.95, length(q));
  color.rgb *= vignette;

  return color;
}
`,author:`bread`,license:`MIT`,description:`The outgoing image swirls and zooms with motion blur into the incoming one`,tags:[`swirl`,`zoom`,`rotate`,`blur`],params:{center:{type:`vec2`,default:[.46,.52],description:`Center of the swirl`},direction:{type:`float`,default:-1},maxRotation:{type:`float`,default:1.95},peakZoom:{type:`float`,default:2.22},swirl:{type:`float`,default:2.85},barrel:{type:`float`,default:.38},motionBlur:{type:`float`,default:1},switchStart:{type:`float`,default:.3},switchEnd:{type:`float`,default:.5},shadow:{type:`float`,default:.16}},textures:[],createdAt:`Wed, 10 Jun 2026 09:26:47 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Rolls`,paramsTypes:{type:`int`,RotDown:`bool`},defaultParams:{type:0,RotDown:!1},glsl:`// Author: Mark Craig
// mrmcsoftware on github and youtube ( http://www.youtube.com/MrMcSoftware )
// License: MIT
// Description: The outgoing image rolls away around a corner, revealing the incoming one
// Tags: rotate, roll

// Rolls Transition by Mark Craig (Copyright © 2022)

// @range(0, 3, 1) Corner to roll around
uniform int type; // = 0
// @param Roll the outgoing image down instead of up
uniform bool RotDown; // = false
// type (0-3): Rotate/Roll from which corner
// RotDown: if true rotate old image down, otherwise rotate old image up

#define M_PI 3.14159265358979323846

vec4 transition(vec2 uv)
{
float theta, c1, s1;
vec2 iResolution = vec2(ratio, 1.0);
vec2 uvi;
// I used if/else instead of switch in case it's an old GPU
if (type == 0) { theta = (RotDown ? M_PI : -M_PI) / 2.0 * progress; uvi.x = 1.0 - uv.x; uvi.y = uv.y; }
else if (type == 1) { theta = (RotDown ? M_PI : -M_PI) / 2.0 * progress; uvi = uv; }
else if (type == 2) { theta = (RotDown ? -M_PI : M_PI) / 2.0 * progress; uvi.x = uv.x; uvi.y = 1.0 - uv.y; }
else if (type == 3) { theta = (RotDown ? -M_PI : M_PI) / 2.0 * progress; uvi = 1.0 - uv; }
c1 = cos(theta); s1 = sin(theta);
vec2 uv2;
uv2.x = (uvi.x * iResolution.x * c1 - uvi.y * iResolution.y * s1);
uv2.y = (uvi.x * iResolution.x * s1 + uvi.y * iResolution.y * c1);
if ((uv2.x >= 0.0) && (uv2.x <= iResolution.x) && (uv2.y >= 0.0) && (uv2.y <= iResolution.y))
	{
	uv2 /= iResolution;
	if (type == 0) { uv2.x = 1.0 - uv2.x; }
	else if (type == 2) { uv2.y = 1.0 - uv2.y; }
	else if (type == 3) { uv2 = 1.0 - uv2; }
	return(getFromColor(uv2));
	}
return(getToColor(uv));
}
`,author:`Mark Craig`,license:`MIT`,description:`The outgoing image rolls away around a corner, revealing the incoming one`,tags:[`rotate`,`roll`],params:{type:{type:`int`,default:0,min:0,max:3,step:1,description:`Corner to roll around`},RotDown:{type:`bool`,default:!1,description:`Roll the outgoing image down instead of up`}},textures:[],createdAt:`Tue, 4 Apr 2023 03:31:55 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`RotateScaleVanish`,paramsTypes:{FadeInSecond:`bool`,ReverseEffect:`bool`,ReverseRotation:`bool`},defaultParams:{FadeInSecond:!0,ReverseEffect:!1,ReverseRotation:!1},glsl:`// Author: Mark Craig
// mrmcsoftware on github and youtube ( http://www.youtube.com/MrMcSoftware )
// License: MIT
// Description: The outgoing image spins and shrinks away over the incoming one
// Tags: rotate, zoom, spin

// RotateScaleVanish Transition by Mark Craig (Copyright © 2022)

// @param Fade in the incoming image
uniform bool FadeInSecond; // = true
// @param Run the effect in reverse
uniform bool ReverseEffect; // = false
// @param Rotate the other way
uniform bool ReverseRotation; // = false

#define M_PI 3.14159265358979323846
#define _TWOPI 6.283185307179586476925286766559

vec4 transition(vec2 uv)
{
vec2 iResolution = vec2(ratio, 1.0);
float t = ReverseEffect ? 1.0 - progress : progress;
float theta = ReverseRotation ? _TWOPI * t : -_TWOPI * t;
float c1 = cos(theta);
float s1 = sin(theta);
float rad = max(0.00001, 1.0 - t);
float xc1 = (uv.x - 0.5) * iResolution.x;
float yc1 = (uv.y - 0.5) * iResolution.y;
float xc2 = (xc1 * c1 - yc1 * s1) / rad;
float yc2 = (xc1 * s1 + yc1 * c1) / rad;
vec2 uv2 = vec2(xc2 + iResolution.x / 2.0, yc2 + iResolution.y / 2.0);
vec4 col3;
vec4 ColorTo = ReverseEffect ? getFromColor(uv) : getToColor(uv);
if ((uv2.x >= 0.0) && (uv2.x <= iResolution.x) && (uv2.y >= 0.0) && (uv2.y <= iResolution.y))
	{
	uv2 /= iResolution;
	col3 = ReverseEffect ? getToColor(uv2) : getFromColor(uv2);
	}
else { col3 = FadeInSecond ? vec4(0.0, 0.0, 0.0, 1.0) : ColorTo; }
return((1.0 - t) * col3 + t * ColorTo); // could have used mix
}
`,author:`Mark Craig`,license:`MIT`,description:`The outgoing image spins and shrinks away over the incoming one`,tags:[`rotate`,`zoom`,`spin`],params:{FadeInSecond:{type:`bool`,default:!0,description:`Fade in the incoming image`},ReverseEffect:{type:`bool`,default:!1,description:`Run the effect in reverse`},ReverseRotation:{type:`bool`,default:!1,description:`Rotate the other way`}},textures:[],createdAt:`Tue, 4 Apr 2023 03:31:48 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`SimpleFlip`,paramsTypes:{},defaultParams:{},glsl:`// Author: nwoeanhinnogaehr
// License: MIT
// Description: The outgoing image flips around the vertical axis into the incoming one
// Tags: flip, horizontal
// Ported from https://gist.github.com/nwoeanhinnogaehr/408045772d255df97520

vec4 transition(vec2 uv) {
  vec2 q = uv;
  uv.x = (uv.x - 0.5) / abs(progress - 0.5) * 0.5 + 0.5;
  vec4 a = getFromColor(uv);
  vec4 b = getToColor(uv);
  return vec4(mix(a, b, step(0.5, progress)).rgb * step(abs(q.x - 0.5), abs(progress - 0.5)), 1.0);
}
`,author:`nwoeanhinnogaehr`,license:`MIT`,description:`The outgoing image flips around the vertical axis into the incoming one`,tags:[`flip`,`horizontal`],params:{},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`SimpleZoom`,paramsTypes:{zoom_quickness:`float`},defaultParams:{zoom_quickness:.8},glsl:`// Author: 0gust1
// License: MIT
// Description: Zooms into the outgoing image, then fades to the incoming one
// Tags: zoom, fade

// @range(0.2, 1) Part of the transition spent zooming
uniform float zoom_quickness; // = 0.8
vec2 zoom(vec2 uv, float amount) {
  return 0.5 + ((uv - 0.5) * (1.0-amount));	
}

vec4 transition (vec2 uv) {
  float nQuick = clamp(zoom_quickness,0.2,1.0);
  return mix(
    getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),
    getToColor(uv),
   smoothstep(nQuick-0.2, 1.0, progress)
  );
}`,author:`0gust1`,license:`MIT`,description:`Zooms into the outgoing image, then fades to the incoming one`,tags:[`zoom`,`fade`],params:{zoom_quickness:{type:`float`,default:.8,min:.2,max:1,description:`Part of the transition spent zooming`}},textures:[],createdAt:`Tue, 6 Mar 2018 00:43:47 +0100`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`SimpleZoomOut`,paramsTypes:{zoom_quickness:`float`,fade:`bool`},defaultParams:{zoom_quickness:.8,fade:!0},glsl:`// Author: Tianshuo
// License: MIT
// Description: The incoming image zooms out into place while fading in
// Tags: zoom, fade


// @range(0.2, 1) Part of the transition spent zooming
uniform float zoom_quickness; // = 0.8
// @param Fade instead of cutting to the incoming image
uniform bool fade; // = true
vec2 zoom(vec2 uv, float amount) {
  return 0.5 + ((uv - 0.5) * (1.0-amount));	
}

vec4 transition (vec2 uv) {
  float nQuick = clamp(zoom_quickness,0.2,1.0);
  return mix(
    getFromColor(uv),
    getToColor(zoom(uv,1.-smoothstep(1.-nQuick, 1., progress))),
   fade?smoothstep(1.0-nQuick, 1., progress):(progress<1.0-nQuick?0.0:1.0)
  );
}
`,author:`Tianshuo`,license:`MIT`,description:`The incoming image zooms out into place while fading in`,tags:[`zoom`,`fade`],params:{zoom_quickness:{type:`float`,default:.8,min:.2,max:1,description:`Part of the transition spent zooming`},fade:{type:`bool`,default:!0,description:`Fade instead of cutting to the incoming image`}},textures:[],createdAt:`Sun, 29 Mar 2026 19:32:53 +0200`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`Slides`,paramsTypes:{type:`int`,In:`bool`},defaultParams:{type:0,In:!1},glsl:`// Author: Mark Craig
// mrmcsoftware on github and youtube ( http://www.youtube.com/MrMcSoftware )
// License: MIT
// Description: The outgoing image slides out, or the incoming one slides in, toward an edge, a corner or the center
// Tags: slide, directional

// Slides Transition by Mark Craig (Copyright © 2022)

uniform int type; // = 0
// @param Slide the incoming image in instead of the outgoing one out
uniform bool In; // = false
// type: slide to/from which edge, which corner, or center
// In: if true slide new image in, otherwise slide old image out

#define rad2 rad / 2.0

vec4 transition(vec2 uv)
{
vec2 uv0 = uv;
float rad = In ? progress : 1.0 - progress;
float xc1, yc1;
// I used if/else instead of switch in case it's an old GPU
if (type == 0) { xc1 = .5 - rad2; yc1 = 0.0; }
else if (type == 1) { xc1 = 1.0 - rad; yc1 = .5 - rad2; }
else if (type == 2) { xc1 = .5 - rad2; yc1 = 1.0 - rad; }
else if (type == 3) { xc1 = 0.0; yc1 = .5 - rad2; }
else if (type == 4) { xc1 = 1.0 - rad; yc1 = 0.0; }
else if (type == 5) { xc1 = 1.0 - rad; yc1 = 1.0 - rad; }
else if (type == 6) { xc1 = 0.0; yc1 = 1.0 - rad; }
else if (type == 7) { xc1 = 0.0; yc1 = 0.0; }
else if (type == 8) { xc1 = .5 - rad2; yc1 = .5 - rad2; }
uv.y = 1.0 - uv.y;
vec2 uv2;
if ((uv.x >= xc1) && (uv.x <= xc1 + rad) && (uv.y >= yc1) && (uv.y <= yc1 + rad))
	{
	uv2 = vec2((uv.x - xc1) / rad, 1.0 - (uv.y - yc1) / rad);
	return(In ? getToColor(uv2) : getFromColor(uv2));
	}
return(In ? getFromColor(uv0) : getToColor(uv0));
}
`,author:`Mark Craig`,license:`MIT`,description:`The outgoing image slides out, or the incoming one slides in, toward an edge, a corner or the center`,tags:[`slide`,`directional`],params:{type:{type:`int`,default:0},In:{type:`bool`,default:!1,description:`Slide the incoming image in instead of the outgoing one out`}},textures:[],createdAt:`Tue, 4 Apr 2023 03:32:13 -0400`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`StarWipe`,paramsTypes:{border_thickness:`float`,star_rotation:`float`,border_color:`vec4`,star_center:`vec2`},defaultParams:{border_thickness:.01,star_rotation:.75,border_color:[1,1,1,1],star_center:[.5,.5]},glsl:`// Author: Ben Lucas
// License: MIT
// Description: A growing star reveals the incoming image
// Tags: wipe, shape, star
#define PI 3.141592653589793
#define STAR_ANGLE 1.2566370614359172

// @param Thickness of the star's border
uniform float border_thickness;// = 0.01
uniform float star_rotation;// = 0.75
// @color Color of the star's border
uniform vec4 border_color; // = vec4(1.0)
// @param Center of the star
uniform vec2 star_center;// = vec2(0.5)

vec2 rotate(vec2 v, float theta) {
    float cosTheta = cos(theta);
    float sinTheta = sin(theta);

    return vec2(
        cosTheta * v.x - sinTheta * v.y,
        sinTheta * v.x + cosTheta * v.y
    );
}

bool inStar(vec2 uv, vec2 center, float radius){
  vec2 uv_centered = uv - center;
  uv_centered = rotate(uv_centered, star_rotation * STAR_ANGLE);
  float theta = atan(uv_centered.y, uv_centered.x) + PI;

  vec2 uv_rotated = rotate(uv_centered, -STAR_ANGLE * (floor(theta / STAR_ANGLE) + 0.5));

  float slope = 0.3;
  if(uv_rotated.y > 0.0){
      return (radius + uv_rotated.x * slope > uv_rotated.y);
  } else {
     return (-radius - uv_rotated.x * slope < uv_rotated.y);
  }
}

vec4 transition (vec2 uv) {
  float progressScaled = (2.0 * border_thickness + 1.0) * progress - border_thickness;
  if(inStar(uv, star_center, progressScaled)){
    return getToColor(uv);
  } else if(inStar(uv, star_center, progressScaled+border_thickness)){
    return border_color;
  } else {
    return getFromColor(uv);
  }
}
`,author:`Ben Lucas`,license:`MIT`,description:`A growing star reveals the incoming image`,tags:[`wipe`,`shape`,`star`],params:{border_thickness:{type:`float`,default:.01,description:`Thickness of the star's border`},star_rotation:{type:`float`,default:.75},border_color:{type:`vec4`,default:[1,1,1,1],color:!0,description:`Color of the star's border`},star_center:{type:`vec2`,default:[.5,.5],description:`Center of the star`}},textures:[],createdAt:`Wed, 1 Apr 2026 10:31:54 -0700`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`StaticFade`,paramsTypes:{n_noise_pixels:`float`,static_luminosity:`float`},defaultParams:{n_noise_pixels:200,static_luminosity:.8},glsl:`// Author: Ben Lucas
// License: MIT
// Description: Cuts to the incoming image halfway, hidden behind a burst of TV static
// Tags: static, noise, retro

uniform float n_noise_pixels ; // = 200.0
uniform float static_luminosity ; // = 0.8

float rnd (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(10.5302340293,70.23492931)))*
        12345.5453123);
}

vec4 staticNoise (vec2 st, float offset, float luminosity) {
  float staticR = luminosity * rnd(st * vec2(offset * 2.0, offset * 3.0));
  float staticG = luminosity * rnd(st * vec2(offset * 3.0, offset * 5.0));
  float staticB = luminosity * rnd(st * vec2(offset * 5.0, offset * 7.0));
  return vec4(staticR, staticG, staticB, 1.0);
}

float staticIntensity(float t)
{
  float transitionProgress = abs(2.0*(t-0.5));
  float transformedThreshold =1.2*(1.0 - transitionProgress)-0.1;
  return min(1.0, transformedThreshold);
}
  
vec4 transition (vec2 uv) {

  float baseMix = step(0.5, progress);
  vec4 transitionMix = mix(
    getFromColor(uv),
    getToColor(uv),
    baseMix
  );
  
  vec2 uvStatic = floor(uv * n_noise_pixels)/n_noise_pixels;
  
  vec4 staticColor = staticNoise(uvStatic, progress, static_luminosity);

  float staticThresh = staticIntensity(progress);
  float staticMix = step(rnd(uvStatic), staticThresh);

  return mix(transitionMix, staticColor, staticMix);
}
`,author:`Ben Lucas`,license:`MIT`,description:`Cuts to the incoming image halfway, hidden behind a burst of TV static`,tags:[`static`,`noise`,`retro`],params:{n_noise_pixels:{type:`float`,default:200},static_luminosity:{type:`float`,default:.8}},textures:[],createdAt:`Fri, 2 Jun 2023 04:27:43 -0400`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`StereoViewer`,paramsTypes:{zoom:`float`,corner_radius:`float`},defaultParams:{zoom:.88,corner_radius:.22},glsl:`// Tunable parameters
// How much to zoom (out) for the effect ~ 0.5 - 1.0
// @range(0.5, 1) How much the images zoom out
uniform float zoom; // = 0.88
// Corner radius as a fraction of the image height
uniform float corner_radius;  // = 0.22

// Author: Ted Schundler
// License: BSD 2 Clause
// Description: Both images shrink into rounded cards that swap, like a stereo viewer toy
// Tags: cards, zoom, retro
// Free for use and modification by anyone with credit

// Copyright (c) 2016, Theodore K Schundler
// All rights reserved.

// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

///////////////////////////////////////////////////////////////////////////////
// Stereo Viewer Toy Transition                                              //
//                                                                           //
// Inspired by ViewMaster / Image3D image viewer devices.                    //
// This effect is similar to what you see when you press the device's lever. //
// There is a quick zoom in / out to make the transition 'valid' for GLSL.io //
///////////////////////////////////////////////////////////////////////////////

const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 c00 = vec2(0.0, 0.0); // the four corner points
const vec2 c01 = vec2(0.0, 1.0);
const vec2 c11 = vec2(1.0, 1.0);
const vec2 c10 = vec2(1.0, 0.0);

// Check if a point is within a given corner
bool in_corner(vec2 p, vec2 corner, vec2 radius) {
  // determine the direction we want to be filled
  vec2 axis = (c11 - corner) - corner;

  // warp the point so we are always testing the bottom left point with the
  // circle centered on the origin
  p = p - (corner + axis * radius);
  p *= axis / radius;
  return (p.x > 0.0 && p.y > -1.0) || (p.y > 0.0 && p.x > -1.0) || dot(p, p) < 1.0;
}

// Check all four corners
// return a float for v2 for anti-aliasing?
bool test_rounded_mask(vec2 p, vec2 corner_size) {
  return
      in_corner(p, c00, corner_size) &&
      in_corner(p, c01, corner_size) &&
      in_corner(p, c10, corner_size) &&
      in_corner(p, c11, corner_size);
}

// Screen blend mode - https://en.wikipedia.org/wiki/Blend_modes
// This more closely approximates what you see than linear blending
vec4 screen(vec4 a, vec4 b) {
  return 1.0 - (1.0 - a) * (1.0 -b);
}

// Given RGBA, find a value that when screened with itself
// will yield the original value.
vec4 unscreen(vec4 c) {
  return 1.0 - sqrt(1.0 - c);
}

// Grab a pixel, only if it isn't masked out by the rounded corners
vec4 sample_with_corners_from(vec2 p, vec2 corner_size) {
  p = (p - 0.5) / zoom + 0.5;
  if (!test_rounded_mask(p, corner_size)) {
    return black;
  }
  return unscreen(getFromColor(p));
}

vec4 sample_with_corners_to(vec2 p, vec2 corner_size) {
  p = (p - 0.5) / zoom + 0.5;
  if (!test_rounded_mask(p, corner_size)) {
    return black;
  }
  return unscreen(getToColor(p));
}

// special sampling used when zooming - extra zoom parameter and don't unscreen
vec4 simple_sample_with_corners_from(vec2 p, vec2 corner_size, float zoom_amt) {
  p = (p - 0.5) / (1.0 - zoom_amt + zoom * zoom_amt) + 0.5;
  if (!test_rounded_mask(p, corner_size)) {
    return black;
  }
  return getFromColor(p);
}

vec4 simple_sample_with_corners_to(vec2 p, vec2 corner_size, float zoom_amt) {
  p = (p - 0.5) / (1.0 - zoom_amt + zoom * zoom_amt) + 0.5;
  if (!test_rounded_mask(p, corner_size)) {
    return black;
  }
  return getToColor(p);
}

// Basic 2D affine transform matrix helpers
// These really shouldn't be used in a fragment shader - I should work out the
// the math for a translate & rotate function as a pair of dot products instead

mat3 rotate2d(float angle, float ratio) {
  float s = sin(angle);
  float c = cos(angle);
  return mat3(
    c, s ,0.0,
    -s, c, 0.0,
    0.0, 0.0, 1.0);
}

mat3 translate2d(float x, float y) {
  return mat3(
    1.0, 0.0, 0,
    0.0, 1.0, 0,
    -x, -y, 1.0);
}

mat3 scale2d(float x, float y) {
  return mat3(
    x, 0.0, 0,
    0.0, y, 0,
    0, 0, 1.0);
}

// Split an image and rotate one up and one down along off screen pivot points
vec4 get_cross_rotated(vec3 p3, float angle, vec2 corner_size, float ratio) {
  angle = angle * angle; // easing
  angle /= 2.4; // works out to be a good number of radians

  mat3 center_and_scale = translate2d(-0.5, -0.5) * scale2d(1.0, ratio);
  mat3 unscale_and_uncenter = scale2d(1.0, 1.0/ratio) * translate2d(0.5,0.5);
  mat3 slide_left = translate2d(-2.0,0.0);
  mat3 slide_right = translate2d(2.0,0.0);
  mat3 rotate = rotate2d(angle, ratio);

  mat3 op_a = center_and_scale * slide_right * rotate * slide_left * unscale_and_uncenter;
  mat3 op_b = center_and_scale * slide_left * rotate * slide_right * unscale_and_uncenter;

  vec4 a = sample_with_corners_from((op_a * p3).xy, corner_size);
  vec4 b = sample_with_corners_from((op_b * p3).xy, corner_size);

  return screen(a, b);
}

// Image stays put, but this time move two masks
vec4 get_cross_masked(vec3 p3, float angle, vec2 corner_size, float ratio) {
  angle = 1.0 - angle;
  angle = angle * angle; // easing
  angle /= 2.4;

  vec4 img;

  mat3 center_and_scale = translate2d(-0.5, -0.5) * scale2d(1.0, ratio);
  mat3 unscale_and_uncenter = scale2d(1.0 / zoom, 1.0 / (zoom * ratio)) * translate2d(0.5,0.5);
  mat3 slide_left = translate2d(-2.0,0.0);
  mat3 slide_right = translate2d(2.0,0.0);
  mat3 rotate = rotate2d(angle, ratio);

  mat3 op_a = center_and_scale * slide_right * rotate * slide_left * unscale_and_uncenter;
  mat3 op_b = center_and_scale * slide_left * rotate * slide_right * unscale_and_uncenter;

  bool mask_a = test_rounded_mask((op_a * p3).xy, corner_size);
  bool mask_b = test_rounded_mask((op_b * p3).xy, corner_size);

  if (mask_a || mask_b) {
    img = sample_with_corners_to(p3.xy, corner_size);
    return screen(mask_a ? img : black, mask_b ? img : black);
  } else {
    return black;
  }
}

vec4 transition(vec2 uv) {
  float a;
  vec2 p=uv.xy/vec2(1.0).xy;
  vec3 p3 = vec3(p.xy, 1.0); // for 2D matrix transforms

  // corner is warped to represent to size after mapping to 1.0, 1.0
  vec2 corner_size = vec2(corner_radius / ratio, corner_radius);

  if (progress <= 0.0) {
    // 0.0: start with the base frame always
    return getFromColor(p);
  } else if (progress < 0.1) {
    // 0.0-0.1: zoom out and add rounded corners
    a = progress / 0.1;
    return  simple_sample_with_corners_from(p, corner_size * a, a);
  } else if (progress < 0.48) {
    // 0.1-0.48: Split original image apart
    a = (progress - 0.1)/0.38;
    return get_cross_rotated(p3, a, corner_size, ratio);
  } else if (progress < 0.9) {
    // 0.48-0.52: black
    // 0.52 - 0.9: unmask new image
    return get_cross_masked(p3, (progress - 0.52)/0.38, corner_size, ratio);
  } else if (progress < 1.0) {
    // zoom out and add rounded corners
    a = (1.0 - progress) / 0.1;
    return simple_sample_with_corners_to(p, corner_size * a, a);
  } else {
    // 1.0 end with base frame
    return getToColor(p);
  }
}
`,author:`Ted Schundler`,license:`BSD 2 Clause`,description:`Both images shrink into rounded cards that swap, like a stereo viewer toy`,tags:[`cards`,`zoom`,`retro`],params:{zoom:{type:`float`,default:.88,min:.5,max:1,description:`How much the images zoom out`},corner_radius:{type:`float`,default:.22}},textures:[],createdAt:`Tue, 20 Feb 2018 23:20:29 +0100`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`StripDatamoshGlitch`,paramsTypes:{strength:`float`,horizontalBars:`float`,verticalSlits:`float`,tear:`float`,chroma:`float`,residue:`float`,noiseAmount:`float`,scanAmount:`float`,flashAmount:`float`},defaultParams:{strength:1,horizontalBars:42,verticalSlits:18,tear:.18,chroma:.032,residue:.62,noiseAmount:.16,scanAmount:.13,flashAmount:.2},glsl:`// Author: bread
// License: MIT
// Description: A datamosh glitch: torn strips, chroma shifts and scan noise drag the outgoing image into the incoming one
// Tags: glitch, datamosh, chromatic

uniform float strength;       // = 1.0
uniform float horizontalBars; // = 42.0
uniform float verticalSlits;  // = 18.0
uniform float tear;           // = 0.18
uniform float chroma;         // = 0.032
uniform float residue;        // = 0.62
uniform float noiseAmount;    // = 0.16
uniform float scanAmount;     // = 0.13
uniform float flashAmount;    // = 0.20

const float PI = 3.141592653589793;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float sat(float v) {
  return clamp(v, 0.0, 1.0);
}

float burst() {
  return pow(max(0.0, sin(progress * PI)), 0.42) * strength;
}

vec2 safeUv(vec2 uv) {
  return clamp(uv, vec2(0.0), vec2(1.0));
}

float stripeY(vec2 uv, float density, float seed, float minWidth, float maxWidth) {
  float y = uv.y * density + seed * 0.137;
  float id = floor(y);
  float f = fract(y);
  float c = hash(vec2(id, seed));
  float w = mix(minWidth, maxWidth, hash(vec2(id + 9.17, seed + 2.31)));
  return 1.0 - smoothstep(w, w + 0.018, abs(f - c));
}

float stripeX(vec2 uv, float density, float seed, float minWidth, float maxWidth) {
  float x = uv.x * density + seed * 0.091;
  float id = floor(x);
  float f = fract(x);
  float c = hash(vec2(id, seed + 41.0));
  float w = mix(minWidth, maxWidth, hash(vec2(id + 4.7, seed + 8.9)));
  return 1.0 - smoothstep(w, w + 0.012, abs(f - c));
}

float brokenGate(vec2 uv, float row, float rnd, float frame) {
  float segs = mix(1.0, 9.0, hash(vec2(row, frame + 44.0)));
  float seg = floor(uv.x * segs);
  return step(0.16, hash(vec2(seg, row + frame * 3.0 + rnd)));
}

float horizontalMask(vec2 uv, float frame) {
  float r1 = floor((uv.y + hash(frame) * 0.031) * horizontalBars * 0.38);
  float r2 = floor((uv.y + hash(frame + 2.0) * 0.013) * horizontalBars);
  float r3 = floor((uv.y + hash(frame + 7.0) * 0.006) * horizontalBars * 3.4);

  float thick = stripeY(uv, horizontalBars * 0.38, frame + 1.0, 0.035, 0.22);
  float mid   = stripeY(uv, horizontalBars,        frame + 4.0, 0.014, 0.11);
  float hair  = stripeY(uv, horizontalBars * 3.4,  frame + 9.0, 0.004, 0.035);

  thick *= step(0.42, hash(vec2(r1, frame + 10.0)));
  mid   *= step(0.48, hash(vec2(r2, frame + 20.0)));
  hair  *= step(0.62, hash(vec2(r3, frame + 30.0)));

  thick *= brokenGate(uv, r1, hash(vec2(r1, frame)), frame);
  mid   *= brokenGate(uv, r2, hash(vec2(r2, frame)), frame + 3.0);

  return sat(max(thick, max(mid, hair)));
}

float verticalMask(vec2 uv, float frame) {
  float col = floor((uv.x + hash(frame + 12.0) * 0.017) * verticalSlits);
  float slit = stripeX(uv, verticalSlits, frame + 13.0, 0.01, 0.075);
  slit *= step(0.66, hash(vec2(col, frame + 19.0)));
  return sat(slit);
}

vec4 chromaFrom(vec2 uv, vec2 s) {
  uv = safeUv(uv);
  return vec4(
    getFromColor(safeUv(uv + s)).r,
    getFromColor(uv).g,
    getFromColor(safeUv(uv - s)).b,
    1.0
  );
}

vec4 chromaTo(vec2 uv, vec2 s) {
  uv = safeUv(uv);
  return vec4(
    getToColor(safeUv(uv - s)).r,
    getToColor(uv).g,
    getToColor(safeUv(uv + s)).b,
    1.0
  );
}

vec2 distortUv(vec2 uv, float dir, float b, float h, float v, float frame) {
  float row = floor(uv.y * horizontalBars);
  float col = floor(uv.x * verticalSlits);

  float rowRnd = hash(vec2(row, frame));
  float colRnd = hash(vec2(col, frame + 27.0));

  float xTear = (rowRnd - 0.5) * 2.0 * tear * b * h;
  xTear += sin(uv.y * 120.0 + progress * 95.0) * 0.006 * b;

  float yDrag = (colRnd - 0.5) * 0.13 * b * v;
  float micro = (hash(vec2(row, col + frame)) - 0.5) * 0.018 * b * max(h, v);

  return uv + vec2(xTear * dir + micro, yDrag);
}

vec4 transition(vec2 uv) {
  if (progress <= 0.0) return getFromColor(uv);
  if (progress >= 1.0) return getToColor(uv);

  float b = burst();
  float frame = floor(progress * 30.0);

  float h = horizontalMask(uv, frame);
  float v = verticalMask(uv, frame);
  float glitch = sat(max(h, v * 0.75));

  float row = floor(uv.y * horizontalBars);
  float rowRnd = hash(vec2(row, frame + 5.0));

  float bandDelay = (rowRnd - 0.5) * 0.30 * h;
  float reveal = smoothstep(0.18, 0.84, progress + bandDelay);

  vec2 split = vec2(chroma * b * (1.0 + 1.7 * glitch), chroma * 0.22 * b * v);

  vec2 fromUv = distortUv(uv,  1.0, b, h, v, frame);
  vec2 toUv   = distortUv(uv, -1.0, b, h, v, frame);

  vec4 color = mix(
    chromaFrom(fromUv, split),
    chromaTo(toUv, split),
    reveal
  );

  // Horizontal time-slice residue: old/new frames dragged through uneven scan bands.
  vec2 smearUv = uv;
  smearUv.x += (rowRnd - 0.5) * 0.46 * b * h;
  smearUv.y += (hash(vec2(row, frame + 31.0)) - 0.5) * 0.045 * b * h;

  float sliceReveal = smoothstep(0.28, 0.78, progress + (rowRnd - 0.5) * 0.22);
  vec4 sliceColor = mix(
    chromaFrom(smearUv, split * 1.65),
    chromaTo(smearUv - vec2((rowRnd - 0.5) * 0.18 * b, 0.0), split * 1.65),
    sliceReveal
  );

  color = mix(color, sliceColor, h * b * residue);

  // Thin scan sparks and broken white lines, like the reference clip's bright horizontal noise.
  float hairLine = stripeY(uv, 190.0, frame + 55.0, 0.002, 0.012);
  hairLine *= step(0.70, hash(vec2(floor(uv.y * 190.0), frame + 56.0)));
  color.rgb += vec3(0.72, 0.90, 1.0) * hairLine * b * 0.28;

  float scan = 0.5 + 0.5 * sin(uv.y * 980.0 + progress * 130.0);
  color.rgb *= 1.0 - scanAmount * b * scan;

  vec2 nCell = floor(uv * vec2(360.0 * ratio, 210.0));
  float n = hash(nCell + vec2(frame * 7.0, frame * 13.0));
  color.rgb += (n - 0.5) * noiseAmount * b * (0.55 + glitch);

  // Slight desaturation during the damage peak makes it feel more like broadcast/video signal corruption.
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(color.rgb, vec3(luma), 0.18 * b * glitch);

  float strobe = step(0.78, hash(vec2(frame, 3.14))) * pow(b, 1.65);
  color.rgb += vec3(strobe * flashAmount);

  return vec4(clamp(color.rgb, vec3(0.0), vec3(1.0)), 1.0);
}
`,author:`bread`,license:`MIT`,description:`A datamosh glitch: torn strips, chroma shifts and scan noise drag the outgoing image into the incoming one`,tags:[`glitch`,`datamosh`,`chromatic`],params:{strength:{type:`float`,default:1},horizontalBars:{type:`float`,default:42},verticalSlits:{type:`float`,default:18},tear:{type:`float`,default:.18},chroma:{type:`float`,default:.032},residue:{type:`float`,default:.62},noiseAmount:{type:`float`,default:.16},scanAmount:{type:`float`,default:.13},flashAmount:{type:`float`,default:.2}},textures:[],createdAt:`Fri, 12 Jun 2026 15:15:42 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`Swirl`,paramsTypes:{},defaultParams:{},glsl:`// License: MIT
// Author: Sergey Kosarevsky
// Description: Both images swirl around the center while crossfading
// Tags: swirl, rotate, blend
// ( http://www.linderdaum.com )
// ported by gre from https://gist.github.com/corporateshark/cacfedb8cca0f5ce3f7c

vec4 transition(vec2 UV)
{
	float Radius = 1.0;

	float T = progress;

	UV -= vec2( 0.5, 0.5 );

	float Dist = length(UV);

	if ( Dist < Radius )
	{
		float Percent = (Radius - Dist) / Radius;
		float A = ( T <= 0.5 ) ? mix( 0.0, 1.0, T/0.5 ) : mix( 1.0, 0.0, (T-0.5)/0.5 );
		float Theta = Percent * Percent * A * 8.0 * 3.14159;
		float S = sin( Theta );
		float C = cos( Theta );
		UV = vec2( dot(UV, vec2(C, -S)), dot(UV, vec2(S, C)) );
	}
	UV += vec2( 0.5, 0.5 );

	vec4 C0 = getFromColor(UV);
	vec4 C1 = getToColor(UV);

	return mix( C0, C1, T );
}
`,author:`Sergey Kosarevsky`,license:`MIT`,description:`Both images swirl around the center while crossfading`,tags:[`swirl`,`rotate`,`blend`],params:{},textures:[],createdAt:`Mon, 12 Jun 2017 12:38:27 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`TVStatic`,paramsTypes:{offset:`float`},defaultParams:{offset:.05},glsl:`// Author: Brandon Anzaldi
// License: MIT
// Description: Cuts to full-screen TV static, then to the incoming image
// Tags: static, noise, retro
// @param Part of the transition, at each end, that shows the images instead of static
uniform float offset; // = 0.05

// Pseudo-random noise function
// http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float noise(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy * progress, vec2(a, b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

vec4 transition(vec2 p) {
  if (progress < offset) {
    return getFromColor(p);
  } else if (progress > (1.0 - offset)) {
    return getToColor(p);
  } else {
    return vec4(vec3(noise(p)), 1.0);
  }
}
`,author:`Brandon Anzaldi`,license:`MIT`,description:`Cuts to full-screen TV static, then to the incoming image`,tags:[`static`,`noise`,`retro`],params:{offset:{type:`float`,default:.05,description:`Part of the transition, at each end, that shows the images instead of static`}},textures:[],createdAt:`Fri, 22 Mar 2019 11:53:09 -0700`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`TilesWave`,paramsTypes:{tileCount:`ivec2`,flipX:`bool`,flipY:`bool`},defaultParams:{tileCount:[8,8],flipX:!0,flipY:!1},glsl:`// Author: numb3r23
// License: MIT
// Description: The incoming image is revealed tile by tile in a diagonal wave
// Tags: tiles, wave, wipe
// Ported from https://gist.github.com/numb3r23/169781bb76f310e2bfde

// @param Number of tiles (columns, rows)
uniform ivec2 tileCount; // = ivec2(8, 8)
uniform bool flipX; // = true
uniform bool flipY; // = false

vec4 transition(vec2 uv) {
  vec2 tileSize = 1.0 / vec2(tileCount);
  vec2 posInTile = fract(uv * vec2(tileCount));
  vec2 tileNum = floor(uv * vec2(tileCount));
  float countTiles = float(tileCount.x * tileCount.y);

  // Diagonal wave from bottom-left to top-right
  float offset = (tileNum.y + tileNum.x * float(tileCount.y)) / countTiles;
  float timeOffset = clamp((progress - offset) * countTiles, 0.0, 0.5);
  float sinTime = 1.0 - abs(cos(fract(timeOffset) * 3.1415926));

  vec2 texC = posInTile;

  if (sinTime <= 0.5) {
    if (flipX) {
      if (texC.x < sinTime || texC.x > 1.0 - sinTime)
        return getFromColor(uv);
      texC.x = texC.x < 0.5
        ? (texC.x - sinTime) * 0.5 / (0.5 - sinTime)
        : (texC.x - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;
    }
    if (flipY) {
      if (texC.y < sinTime || texC.y > 1.0 - sinTime)
        return getFromColor(uv);
      texC.y = texC.y < 0.5
        ? (texC.y - sinTime) * 0.5 / (0.5 - sinTime)
        : (texC.y - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;
    }
    vec2 globalUV = tileNum * tileSize + texC * tileSize;
    return getFromColor(globalUV);
  } else {
    if (flipX) {
      if (texC.x > sinTime || texC.x < 1.0 - sinTime)
        return getToColor(uv);
      texC.x = texC.x < 0.5
        ? (texC.x - sinTime) * 0.5 / (0.5 - sinTime)
        : (texC.x - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;
      texC.x = 1.0 - texC.x;
    }
    if (flipY) {
      if (texC.y > sinTime || texC.y < 1.0 - sinTime)
        return getToColor(uv);
      texC.y = texC.y < 0.5
        ? (texC.y - sinTime) * 0.5 / (0.5 - sinTime)
        : (texC.y - 0.5) * 0.5 / (0.5 - sinTime) + 0.5;
      texC.y = 1.0 - texC.y;
    }
    vec2 globalUV = tileNum * tileSize + texC * tileSize;
    return getToColor(globalUV);
  }
}
`,author:`numb3r23`,license:`MIT`,description:`The incoming image is revealed tile by tile in a diagonal wave`,tags:[`tiles`,`wave`,`wipe`],params:{tileCount:{type:`ivec2`,default:[8,8],description:`Number of tiles (columns, rows)`},flipX:{type:`bool`,default:!0},flipY:{type:`bool`,default:!1}},textures:[],createdAt:`Sun, 29 Mar 2026 20:32:54 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`TopBottom`,paramsTypes:{},defaultParams:{},glsl:`// Author: zhmy
// License: MIT
// Description: The outgoing image shrinks away upward while the incoming one slides in from the bottom
// Tags: slide, zoom, vertical

const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
    return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
    vec2 spfr,spto = vec2(-1.);
    float size = mix(1.0, 3.0, progress*0.2);
    spto = (uv + vec2(-0.5,-0.5))*vec2(size,size)+vec2(0.5,0.5);
    spfr = (uv + vec2(0.0, 1.0 - progress));
    if(inBounds(spfr)){
        return getToColor(spfr);
    } else if(inBounds(spto)){
        return getFromColor(spto) * (1.0 - progress);
    } else{
        return black;
    }
}`,author:`zhmy`,license:`MIT`,description:`The outgoing image shrinks away upward while the incoming one slides in from the bottom`,tags:[`slide`,`zoom`,`vertical`],params:{},textures:[],createdAt:`Thu, 17 Dec 2020 11:50:34 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`VerticalClose`,paramsTypes:{},defaultParams:{},glsl:`// Author: martiniti
// License: MIT
// Description: The incoming image closes in from the left and right edges toward the middle
// Tags: wipe, split

vec4 transition (vec2 uv) {

  float s = 2.0 - abs((uv.x - 0.5) / (progress - 1.0)) - 2.0 * progress;
  
  return mix(
    getFromColor(uv),
    getToColor(uv),
    smoothstep(0.5, 0.0, s)
  );
}
`,author:`martiniti`,license:`MIT`,description:`The incoming image closes in from the left and right edges toward the middle`,tags:[`wipe`,`split`],params:{},textures:[],createdAt:`Tue, 4 Apr 2023 10:35:17 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`VerticalOpen`,paramsTypes:{},defaultParams:{},glsl:`// Author: martiniti
// License: MIT
// Description: The incoming image opens from a line in the middle toward the left and right edges
// Tags: wipe, split

vec4 transition (vec2 uv) {

  float regress = 1.0 - progress;
  float s = 2.0 - abs((uv.x - 0.5) / (regress - 1.0)) - 2.0 * regress;
  
  return mix(
    getFromColor(uv),
    getToColor(uv),
    smoothstep(0.0, 0.5, s)
  );
}
`,author:`martiniti`,license:`MIT`,description:`The incoming image opens from a line in the middle toward the left and right edges`,tags:[`wipe`,`split`],params:{},textures:[],createdAt:`Tue, 4 Apr 2023 10:35:12 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`WaterDrop`,paramsTypes:{amplitude:`float`,speed:`float`},defaultParams:{amplitude:30,speed:30},glsl:`// Author: Paweł Płóciennik
// License: MIT
// Description: Ripples spread from the center like a drop falling into water, crossfading to the incoming image
// Tags: ripple, water, blend
// @param Frequency of the ripples
uniform float amplitude; // = 30
// @param Speed of the ripples
uniform float speed; // = 30

vec4 transition(vec2 p) {
  vec2 dir = p - vec2(.5);
  float dist = length(dir);

  if (dist > progress) {
    return mix(getFromColor( p), getToColor( p), progress);
  } else {
    vec2 offset = dir * sin(dist * amplitude - progress * speed);
    return mix(getFromColor( p + offset), getToColor( p), progress);
  }
}
`,author:`Paweł Płóciennik`,license:`MIT`,description:`Ripples spread from the center like a drop falling into water, crossfading to the incoming image`,tags:[`ripple`,`water`,`blend`],params:{amplitude:{type:`float`,default:30,description:`Frequency of the ripples`},speed:{type:`float`,default:30,description:`Speed of the ripples`}},textures:[],createdAt:`Wed, 21 Feb 2018 19:37:15 +0100`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`ZoomInCircles`,paramsTypes:{},defaultParams:{},glsl:`// License: MIT
// Author: dycm8009
// Description: Concentric rings of the outgoing image zoom at different speeds before revealing the incoming one
// Tags: zoom, circle
// ported by gre from https://gist.github.com/dycm8009/948e99b1800e81ad909a

vec2 zoom(vec2 uv, float amount) {
  return 0.5 + ((uv - 0.5) * amount);	
}

vec4 transition(vec2 uv) {
  vec2 ratio2 = vec2(1.0, 1.0 / ratio);
  // TODO: some timing are hardcoded but should be one or many parameters
  // TODO: should also be able to configure how much circles
  // TODO: if() branching should be avoided when possible, prefer use of step() & other functions
  vec2 r = 2.0 * ((vec2(uv.xy) - 0.5) * ratio2);
  float pro = progress / 0.8;
  float z = pro * 0.2;
  float t = 0.0;
  if (pro > 1.0) {
    z = 0.2 + (pro - 1.0) * 5.;
    t = clamp((progress - 0.8) / 0.07, 0.0, 1.0);
  }
  if (length(r) < 0.5+z) {
    // uv = zoom(uv, 0.9 - 0.1 * pro);
  }
  else if (length(r) < 0.8+z*1.5) {
    uv = zoom(uv, 1.0 - 0.15 * pro);
    t = t * 0.5;
  }
  else if (length(r) < 1.2+z*2.5) {
    uv = zoom(uv, 1.0 - 0.2 * pro);
    t = t * 0.2;
  }
  else {
    uv = zoom(uv, 1.0 - 0.25 * pro);
  }
  return mix(getFromColor(uv), getToColor(uv), t);
}
`,author:`dycm8009`,license:`MIT`,description:`Concentric rings of the outgoing image zoom at different speeds before revealing the incoming one`,tags:[`zoom`,`circle`],params:{},textures:[],createdAt:`Mon, 12 Jun 2017 11:24:34 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`ZoomLeftWipe`,paramsTypes:{zoom_quickness:`float`},defaultParams:{zoom_quickness:.8},glsl:`// Author: Handk
// License: MIT
// Description: Zooms into the outgoing image, then the incoming one wipes in from right to left
// Tags: zoom, wipe, horizontal

// @param Part of the first half spent zooming (capped at 0.5)
uniform float zoom_quickness; // = 0.8
vec2 zoom(vec2 uv, float amount) {
  if(amount<0.5)
  return 0.5 + ((uv - 0.5) * (1.0-amount));
  else
  return 0.5 + ((uv - 0.5) * (amount));
  
}

vec4 transition (vec2 uv) {
  float nQuick = clamp(zoom_quickness,0.0,0.5);
  if(progress<0.5){
    vec4 c= mix(
      getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),
      getToColor(uv),
     step(0.5, progress)
    );
    
    return c;
  }
  else{
    vec2 p=uv.xy/vec2(1.0).xy;
    vec4 d=getFromColor(p);
    vec4 e=getToColor(p);
    vec4 f= mix(d, e, step(1.0-p.x,(progress-0.5)*2.0));
    
    return f;
  }
}
`,author:`Handk`,license:`MIT`,description:`Zooms into the outgoing image, then the incoming one wipes in from right to left`,tags:[`zoom`,`wipe`,`horizontal`],params:{zoom_quickness:{type:`float`,default:.8,description:`Part of the first half spent zooming (capped at 0.5)`}},textures:[],createdAt:`Tue, 15 Mar 2022 21:20:28 +0900`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`ZoomRigthWipe`,paramsTypes:{zoom_quickness:`float`},defaultParams:{zoom_quickness:.8},glsl:`// Author: Handk
// License: MIT
// Description: Zooms into the outgoing image, then the incoming one wipes in from left to right
// Tags: zoom, wipe, horizontal

// @param Part of the first half spent zooming (capped at 0.5)
uniform float zoom_quickness; // = 0.8
vec2 zoom(vec2 uv, float amount) {
  if(amount<0.5)
  return 0.5 + ((uv - 0.5) * (1.0-amount));
  else
  return 0.5 + ((uv - 0.5) * (amount));
  
}

vec4 transition (vec2 uv) {
  float nQuick = clamp(zoom_quickness,0.0,0.5);
  if(progress<0.5){
    vec4 c= mix(
      getFromColor(zoom(uv, smoothstep(0.0, nQuick, progress))),
      getToColor(uv),
     step(0.5, progress)
    );
    
    return c;
  }
  else{
    vec2 p=uv.xy/vec2(1.0).xy;
    vec4 d=getFromColor(p);
    vec4 e=getToColor(p);
    vec4 f= mix(d, e, step(0.0+p.x,(progress-0.5)*2.0));
    
    return f;
  }
}
`,author:`Handk`,license:`MIT`,description:`Zooms into the outgoing image, then the incoming one wipes in from left to right`,tags:[`zoom`,`wipe`,`horizontal`],params:{zoom_quickness:{type:`float`,default:.8,description:`Part of the first half spent zooming (capped at 0.5)`}},textures:[],createdAt:`Tue, 15 Mar 2022 21:20:28 +0900`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`angular`,paramsTypes:{startingAngle:`float`},defaultParams:{startingAngle:90},glsl:`// Author: Fernando Kuteken
// License: MIT
// Description: A wipe that sweeps around the center from a starting angle
// Tags: wipe, radial, clock

#define PI 3.141592653589

// @range(0, 360) Angle where the wipe starts, in degrees
uniform float startingAngle; // = 90

vec4 transition (vec2 uv) {
  
  float offset = startingAngle * PI / 180.0;
  float angle = atan(uv.y - 0.5, uv.x - 0.5) + offset;
  float normalizedAngle = (angle + PI) / (2.0 * PI);
  
  normalizedAngle = normalizedAngle - floor(normalizedAngle);

  return mix(
    getFromColor(uv),
    getToColor(uv),
    step(normalizedAngle, progress)
    );
}
`,author:`Fernando Kuteken`,license:`MIT`,description:`A wipe that sweeps around the center from a starting angle`,tags:[`wipe`,`radial`,`clock`],params:{startingAngle:{type:`float`,default:90,min:0,max:360,description:`Angle where the wipe starts, in degrees`}},textures:[],createdAt:`Sun, 28 May 2017 18:30:24 -0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`burn`,paramsTypes:{color:`vec3`},defaultParams:{color:[.9,.4,.2]},glsl:`// Author: gre
// License: MIT
// Description: A crossfade that brightens toward a color in the middle
// Tags: fade, color, flash
// @color Color the images brighten toward
uniform vec3 color /* = vec3(0.9, 0.4, 0.2) */;
vec4 transition (vec2 uv) {
  return mix(
    getFromColor(uv) + vec4(progress*color, 1.0),
    getToColor(uv) + vec4((1.0-progress)*color, 1.0),
    progress
  );
}
`,author:`gre`,license:`MIT`,description:`A crossfade that brightens toward a color in the middle`,tags:[`fade`,`color`,`flash`],params:{color:{type:`vec3`,default:[.9,.4,.2],color:!0,description:`Color the images brighten toward`}},textures:[],createdAt:`Sat, 20 May 2017 19:28:26 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`burn0`,paramsTypes:{burnColor:`vec3`},defaultParams:{burnColor:[1,.5,0]},glsl:`// Author: liubailin2020@gmail.com
// License: MIT
// Description: The outgoing image burns away in noisy, glowing patches
// Tags: burn, fire, noise

// @color Color of the burning edges
uniform vec3 burnColor; // = vec3(1.0, 0.5, 0.0)

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

#define OCTAVES 4
float fbm (in vec2 st) {
    float value = 0.0;
    float amplitude = .5;
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

vec4 transition (vec2 uv) {
    if (progress <= 0.0) return getFromColor(uv);
    if (progress >= 1.0) return getToColor(uv);
    vec4 from = getFromColor(uv);
    vec4 to = getToColor(uv);
    float n = fbm(uv * 4.);
    float l = smoothstep(progress, progress + 0.05, n);
    float edge = (1.0 - l) * l * 5.0;
    return mix(to, from, l) + vec4(burnColor, 0.0) * edge;
}
`,author:`liubailin2020@gmail.com`,license:`MIT`,description:`The outgoing image burns away in noisy, glowing patches`,tags:[`burn`,`fire`,`noise`],params:{burnColor:{type:`vec3`,default:[1,.5,0],color:!0,description:`Color of the burning edges`}},textures:[],createdAt:`Thu, 4 Jul 2024 14:49:27 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`cannabisleaf`,paramsTypes:{},defaultParams:{},glsl:`// Author: @Flexi23
// License: MIT
// Description: A cannabis-leaf shape grows from the center to reveal the incoming image
// Tags: shape, wipe

// inspired by http://www.wolframalpha.com/input/?i=cannabis+curve

vec4 transition (vec2 uv) {
  if(progress == 0.0){
    return getFromColor(uv);
  }
  vec2 leaf_uv = (uv - vec2(0.5))/10./pow(progress,3.5);
	leaf_uv.y += 0.35;
	float r = 0.18;
	float o = atan(leaf_uv.y, leaf_uv.x);
  return mix(getFromColor(uv), getToColor(uv), 1.-step(1. - length(leaf_uv)+r*(1.+sin(o))*(1.+0.9 * cos(8.*o))*(1.+0.1*cos(24.*o))*(0.9+0.05*cos(200.*o)), 1.));
}
`,author:`@Flexi23`,license:`MIT`,description:`A cannabis-leaf shape grows from the center to reveal the incoming image`,tags:[`shape`,`wipe`],params:{},textures:[],createdAt:`Thu, 1 Jun 2017 15:58:58 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`chessboard`,paramsTypes:{grid_num:`float`},defaultParams:{grid_num:10},glsl:`// Author: lql
// License: MIT
// Description: A chessboard pattern of squares reveals the incoming image
// Tags: grid, squares, pattern

// @param Number of squares per row
uniform float grid_num; // = 10.0

vec4 transition(vec2 uv) {
    vec2 st = uv * grid_num;
    vec2 idx = floor(st);
    vec2 grid = fract(st);

    vec4 a = getFromColor(uv);
    vec4 b = getToColor(uv);

    float checker = mod(idx.x + idx.y, 2.0);
    float mixFactor;

    if (progress <= 0.5) {
        mixFactor = (checker > 0.5) ? step(grid.x, progress * 2.0) : 0.0;
    } else {
        mixFactor = (checker < 0.5) ? step(grid.x, (progress - 0.5) * 2.0) : 1.0;
    }

    return mix(a, b, mixFactor);
}
`,author:`lql`,license:`MIT`,description:`A chessboard pattern of squares reveals the incoming image`,tags:[`grid`,`squares`,`pattern`],params:{grid_num:{type:`float`,default:10,description:`Number of squares per row`}},textures:[],createdAt:`Mon, 22 Jan 2024 22:35:57 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`circle`,paramsTypes:{center:`vec2`,backColor:`vec3`},defaultParams:{center:[.5,.5],backColor:[.1,.1,.1]},glsl:`// Author: Fernando Kuteken
// License: MIT
// Description: The outgoing image closes into a circle over a background color, then the incoming one opens from it
// Tags: circle, iris, shape

// @param Center of the circle
uniform vec2 center; // = vec2(0.5, 0.5)
// @color Background color
uniform vec3 backColor; // = vec3(0.1, 0.1, 0.1)

vec4 transition (vec2 uv) {
  
  float distance = length(uv - center);
  float radius = sqrt(8.0) * abs(progress - 0.5);
  
  if (distance > radius) {
    return vec4(backColor, 1.0);
  }
  else {
    if (progress < 0.5) return getFromColor(uv);
    else return getToColor(uv);
  }
}
`,author:`Fernando Kuteken`,license:`MIT`,description:`The outgoing image closes into a circle over a background color, then the incoming one opens from it`,tags:[`circle`,`iris`,`shape`],params:{center:{type:`vec2`,default:[.5,.5],description:`Center of the circle`},backColor:{type:`vec3`,default:[.1,.1,.1],color:!0,description:`Background color`}},textures:[],createdAt:`Sun, 28 May 2017 18:00:31 -0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`circleopen`,paramsTypes:{smoothness:`float`,opening:`bool`},defaultParams:{smoothness:.3,opening:!0},glsl:`// Author: gre
// License: MIT
// Description: A soft-edged circle opens from the center to reveal the incoming image
// Tags: circle, iris, wipe
// @param Softness of the circle's edge
uniform float smoothness; // = 0.3
// @param Open the circle; false closes it instead
uniform bool opening; // = true

const vec2 center = vec2(0.5, 0.5);
const float SQRT_2 = 1.414213562373;

vec4 transition (vec2 uv) {
  float x = opening ? progress : 1.-progress;
  float m = smoothstep(-smoothness, 0.0, SQRT_2*distance(center, uv) - x*(1.+smoothness));
  return mix(getFromColor(uv), getToColor(uv), opening ? 1.-m : m);
}
`,author:`gre`,license:`MIT`,description:`A soft-edged circle opens from the center to reveal the incoming image`,tags:[`circle`,`iris`,`wipe`],params:{smoothness:{type:`float`,default:.3,description:`Softness of the circle's edge`},opening:{type:`bool`,default:!0,description:`Open the circle; false closes it instead`}},textures:[],createdAt:`Sat, 20 May 2017 19:28:26 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`colorphase`,paramsTypes:{fromStep:`vec4`,toStep:`vec4`},defaultParams:{fromStep:[0,.2,.4,0],toStep:[.6,.8,1,1]},glsl:`// Author: gre
// License: MIT
// Description: A crossfade in which each color channel changes at a different time
// Tags: fade, color

// Usage: fromStep and toStep must be in [0.0, 1.0] range 
// and all(fromStep) must be < all(toStep)

// @range(0, 1) When each channel (r, g, b, a) starts changing
uniform vec4 fromStep; // = vec4(0.0, 0.2, 0.4, 0.0)
// @range(0, 1) When each channel (r, g, b, a) finishes changing
uniform vec4 toStep; // = vec4(0.6, 0.8, 1.0, 1.0)

vec4 transition (vec2 uv) {
  vec4 a = getFromColor(uv);
  vec4 b = getToColor(uv);
  return mix(a, b, smoothstep(fromStep, toStep, vec4(progress)));
}
`,author:`gre`,license:`MIT`,description:`A crossfade in which each color channel changes at a different time`,tags:[`fade`,`color`],params:{fromStep:{type:`vec4`,default:[0,.2,.4,0],min:0,max:1,description:`When each channel (r, g, b, a) starts changing`},toStep:{type:`vec4`,default:[.6,.8,1,1],min:0,max:1,description:`When each channel (r, g, b, a) finishes changing`}},textures:[],createdAt:`Sat, 27 May 2017 14:09:58 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`coord-from-in`,paramsTypes:{},defaultParams:{},glsl:`// Author: haiyoucuv
// License: MIT
// Description: A crossfade in which the colors of one image displace the other
// Tags: displace, distort, blend

vec4 transition (vec2 uv) {

  vec4 coordTo = getToColor(uv);
  vec4 coordFrom = getFromColor(uv);

  return mix(
    getFromColor(mix(uv, coordTo.rg, progress)),
    getToColor(mix(coordFrom.rg, uv, progress)),
    progress
  );

}
`,author:`haiyoucuv`,license:`MIT`,description:`A crossfade in which the colors of one image displace the other`,tags:[`displace`,`distort`,`blend`],params:{},textures:[],createdAt:`Tue, 15 Mar 2022 20:22:47 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`crosshatch`,paramsTypes:{center:`vec2`,threshold:`float`,fadeEdge:`float`},defaultParams:{center:[.5,.5],threshold:3,fadeEdge:.1},glsl:`// License: MIT
// Author: pthrasher
// Description: The incoming image appears through a crosshatch of lines spreading from the center
// Tags: pattern, lines, noise
// adapted by gre from https://gist.github.com/pthrasher/04fd9a7de4012cbb03f6

// @param Point the lines spread from
uniform vec2 center; // = vec2(0.5)
uniform float threshold; // = 3.0
uniform float fadeEdge; // = 0.1

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
vec4 transition(vec2 p) {
  float dist = distance(center, p) / threshold;
  float r = progress - min(rand(vec2(p.y, 0.0)), rand(vec2(0.0, p.x)));
  return mix(getFromColor(p), getToColor(p), mix(0.0, mix(step(dist, r), 1.0, smoothstep(1.0-fadeEdge, 1.0, progress)), smoothstep(0.0, fadeEdge, progress)));    
}
`,author:`pthrasher`,license:`MIT`,description:`The incoming image appears through a crosshatch of lines spreading from the center`,tags:[`pattern`,`lines`,`noise`],params:{center:{type:`vec2`,default:[.5,.5],description:`Point the lines spread from`},threshold:{type:`float`,default:3},fadeEdge:{type:`float`,default:.1}},textures:[],createdAt:`Mon, 12 Jun 2017 10:02:12 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`crosswarp`,paramsTypes:{},defaultParams:{},glsl:`// Author: Eke Péter <peterekepeter@gmail.com>
// License: MIT
// Description: The outgoing image zooms in while the incoming one zooms out into place, sweeping from right to left
// Tags: warp, zoom, horizontal
vec4 transition(vec2 p) {
  float x = progress;
  x=smoothstep(.0,1.0,(x*2.0+p.x-1.0));
  return mix(getFromColor((p-.5)*(1.-x)+.5), getToColor((p-.5)*x+.5), x);
}
`,author:`Eke Péter <peterekepeter@gmail.com>`,license:`MIT`,description:`The outgoing image zooms in while the incoming one zooms out into place, sweeping from right to left`,tags:[`warp`,`zoom`,`horizontal`],params:{},textures:[],createdAt:`Sat, 27 May 2017 00:19:45 +0300`,updatedAt:`Fri, 9 Oct 2026 22:46:55 +0200`},{name:`cube`,paramsTypes:{persp:`float`,unzoom:`float`,reflection:`float`,floating:`float`},defaultParams:{persp:.7,unzoom:.3,reflection:.4,floating:3},glsl:`// Author: gre
// License: MIT
// Description: The two images are faces of a rotating 3D cube, with a floor reflection
// Tags: 3d, cube, rotate, reflection
// @range(0, 1) Amount of perspective
uniform float persp; // = 0.7
uniform float unzoom; // = 0.3
// @range(0, 1) Strength of the reflection
uniform float reflection; // = 0.4
uniform float floating; // = 3.0

vec2 project (vec2 p) {
  return p * vec2(1.0, -1.2) + vec2(0.0, -floating/100.);
}

bool inBounds (vec2 p) {
  return all(lessThan(vec2(0.0), p)) && all(lessThan(p, vec2(1.0)));
}

vec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {
  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);
  pfr = project(pfr);
  // FIXME avoid branching might help perf!
  if (inBounds(pfr)) {
    c += mix(vec4(0.0), getFromColor(pfr), reflection * mix(1.0, 0.0, pfr.y));
  }
  pto = project(pto);
  if (inBounds(pto)) {
    c += mix(vec4(0.0), getToColor(pto), reflection * mix(1.0, 0.0, pto.y));
  }
  return c;
}

// p : the position
// persp : the perspective in [ 0, 1 ]
// center : the xcenter in [0, 1] \\ 0.5 excluded
vec2 xskew (vec2 p, float persp, float center) {
  float x = mix(p.x, 1.0-p.x, center);
  return (
    (
      vec2( x, (p.y - 0.5*(1.0-persp) * x) / (1.0+(persp-1.0)*x) )
      - vec2(0.5-distance(center, 0.5), 0.0)
    )
    * vec2(0.5 / distance(center, 0.5) * (center<0.5 ? 1.0 : -1.0), 1.0)
    + vec2(center<0.5 ? 0.0 : 1.0, 0.0)
  );
}

vec4 transition(vec2 op) {
  float uz = unzoom * 2.0*(0.5-distance(0.5, progress));
  vec2 p = -uz*0.5+(1.0+uz) * op;
  vec2 fromP = xskew(
    (p - vec2(progress, 0.0)) / vec2(1.0-progress, 1.0),
    1.0-mix(progress, 0.0, persp),
    0.0
  );
  vec2 toP = xskew(
    p / vec2(progress, 1.0),
    mix(pow(progress, 2.0), 1.0, persp),
    1.0
  );
  // FIXME avoid branching might help perf!
  if (inBounds(fromP)) {
    return getFromColor(fromP);
  }
  else if (inBounds(toP)) {
    return getToColor(toP);
  }
  return bgColor(op, fromP, toP);
}
`,author:`gre`,license:`MIT`,description:`The two images are faces of a rotating 3D cube, with a floor reflection`,tags:[`3d`,`cube`,`rotate`,`reflection`],params:{persp:{type:`float`,default:.7,min:0,max:1,description:`Amount of perspective`},unzoom:{type:`float`,default:.3},reflection:{type:`float`,default:.4,min:0,max:1,description:`Strength of the reflection`},floating:{type:`float`,default:3}},textures:[],createdAt:`Sat, 27 May 2017 11:39:22 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`directional-easing`,paramsTypes:{direction:`vec2`},defaultParams:{direction:[0,1]},glsl:`// Author: Max Plotnikov
// License: MIT
// Description: Like Directional, with an eased movement
// Tags: slide, push, directional

// @param Direction of the movement
uniform vec2 direction; // = vec2(0.0, 1.0)

vec4 transition (vec2 uv) {
  float easing = sqrt((2.0 - progress) * progress);
  vec2 p = uv + easing * sign(direction);
  vec2 f = fract(p);
  return mix(
    getToColor(f),
    getFromColor(f),
    step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0)
  );
}
`,author:`Max Plotnikov`,license:`MIT`,description:`Like Directional, with an eased movement`,tags:[`slide`,`push`,`directional`],params:{direction:{type:`vec2`,default:[0,1],description:`Direction of the movement`}},textures:[],createdAt:`Wed, 23 Sep 2020 22:54:49 +0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`directionalwarp`,paramsTypes:{smoothness:`float`,direction:`vec2`},defaultParams:{smoothness:.1,direction:[-1,1]},glsl:`// Author: pschroen
// License: MIT
// Description: A diagonal wipe with a warped, smeared edge
// Tags: wipe, warp, directional

// @param Softness of the edge
uniform float smoothness; // = 0.1
// @param Direction of the wipe
uniform vec2 direction; // = vec2(-1.0, 1.0)

const vec2 center = vec2(0.5, 0.5);

vec4 transition (vec2 uv) {
  vec2 v = normalize(direction);
  v /= abs(v.x) + abs(v.y);
  float d = v.x * center.x + v.y * center.y;
  float m = 1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d - 0.5 + progress * (1.0 + smoothness)));
  return mix(getFromColor((uv - 0.5) * (1.0 - m) + 0.5), getToColor((uv - 0.5) * m + 0.5), m);
}
`,author:`pschroen`,license:`MIT`,description:`A diagonal wipe with a warped, smeared edge`,tags:[`wipe`,`warp`,`directional`],params:{smoothness:{type:`float`,default:.1,description:`Softness of the edge`},direction:{type:`vec2`,default:[-1,1],description:`Direction of the wipe`}},textures:[],createdAt:`Wed, 13 Dec 2017 12:08:49 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`directionalwipe`,paramsTypes:{direction:`vec2`,smoothness:`float`},defaultParams:{direction:[1,-1],smoothness:.5},glsl:`// Author: gre
// License: MIT
// Description: A soft-edged diagonal wipe
// Tags: wipe, directional

// @param Direction of the wipe
uniform vec2 direction; // = vec2(1.0, -1.0)
// @param Softness of the edge
uniform float smoothness; // = 0.5
 
const vec2 center = vec2(0.5, 0.5);
 
vec4 transition (vec2 uv) {
  vec2 v = normalize(direction);
  v /= abs(v.x)+abs(v.y);
  float d = v.x * center.x + v.y * center.y;
  float m =
    (1.0-step(progress, 0.0)) * // there is something wrong with our formula that makes m not equals 0.0 with progress is 0.0
    (1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d-0.5+progress*(1.+smoothness))));
  return mix(getFromColor(uv), getToColor(uv), m);
}
`,author:`gre`,license:`MIT`,description:`A soft-edged diagonal wipe`,tags:[`wipe`,`directional`],params:{direction:{type:`vec2`,default:[1,-1],description:`Direction of the wipe`},smoothness:{type:`float`,default:.5,description:`Softness of the edge`}},textures:[],createdAt:`Fri, 26 May 2017 10:41:57 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`displacement`,paramsTypes:{strength:`float`},defaultParams:{strength:.5},glsl:`// Author: Travis Fischer
// License: MIT
// Description: A crossfade in which a displacement map (an extra grayscale texture) warps both images
// Tags: displace, distort, blend
//
// Adapted from a Codrops article by Robin Delaporte
// https://tympanus.net/Development/DistortionHoverEffect

uniform sampler2D displacementMap;

// @param Strength of the displacement
uniform float strength; // = 0.5

vec4 transition (vec2 uv) {
  float displacement = texture2D(displacementMap, uv).r * strength;

  vec2 uvFrom = vec2(uv.x + progress * displacement, uv.y);
  vec2 uvTo = vec2(uv.x - (1.0 - progress) * displacement, uv.y);

  return mix(
    getFromColor(uvFrom),
    getToColor(uvTo),
    progress
  );
}
`,author:`Travis Fischer`,license:`MIT`,description:`A crossfade in which a displacement map (an extra grayscale texture) warps both images`,tags:[`displace`,`distort`,`blend`],params:{strength:{type:`float`,default:.5,description:`Strength of the displacement`}},textures:[`displacementMap`],createdAt:`Tue, 10 Apr 2018 23:03:38 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`dissolve`,paramsTypes:{uLineWidth:`float`,uSpreadClr:`vec3`,uHotClr:`vec3`,uPow:`float`,uIntensity:`float`},defaultParams:{uLineWidth:.1,uSpreadClr:[1,0,0],uHotClr:[.9,.9,.2],uPow:5,uIntensity:1},glsl:`// Author: hjm1fb
// License: MIT
// Description: The incoming image spreads over the outgoing one with a hot, glowing edge
// Tags: dissolve, burn, glow

uniform float uLineWidth; // = 0.1
// @color Color of the spreading edge
uniform vec3 uSpreadClr; // = vec3(1.0, 0.0, 0.0)
// @color Color of the hottest part of the edge
uniform vec3 uHotClr; // = vec3(0.9, 0.9, 0.2)
uniform float uPow; // = 5.0
uniform float uIntensity; // = 1.0

vec2 hash(vec2 p)  // replace this by something better
{
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(in vec2 p) {
  const float K1 = 0.366025404;  // (sqrt(3)-1)/2;
  const float K2 = 0.211324865;  // (3-sqrt(3))/6;

  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}

vec4 transition(vec2 uv) {
  vec4 from = getFromColor(uv);
  vec4 to = getToColor(uv);
  vec4 outColor;
  float burn;
  burn = 0.5 + 0.5 * (0.299 * from.r + 0.587 * from.g + 0.114 * from.b);

  float show = burn - progress;
  if (show < 0.001) {
    outColor = to;
  } else {
    float factor = 1.0 - smoothstep(0.0, uLineWidth, show);
    vec3 burnColor = mix(uSpreadClr, uHotClr, factor);
    burnColor = pow(burnColor, vec3(uPow)) * uIntensity;
    vec3 finalRGB = mix(from.rgb, burnColor, factor * step(0.0001, progress));
    outColor = vec4(finalRGB * from.a, from.a);
  }
  return outColor;
}
`,author:`hjm1fb`,license:`MIT`,description:`The incoming image spreads over the outgoing one with a hot, glowing edge`,tags:[`dissolve`,`burn`,`glow`],params:{uLineWidth:{type:`float`,default:.1},uSpreadClr:{type:`vec3`,default:[1,0,0],color:!0,description:`Color of the spreading edge`},uHotClr:{type:`vec3`,default:[.9,.9,.2],color:!0,description:`Color of the hottest part of the edge`},uPow:{type:`float`,default:5},uIntensity:{type:`float`,default:1}},textures:[],createdAt:`Fri, 2 Jun 2023 16:25:50 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`doorway`,paramsTypes:{reflection:`float`,perspective:`float`,depth:`float`},defaultParams:{reflection:.4,perspective:.4,depth:3},glsl:`// Author: gre
// License: MIT
// Description: The outgoing image opens like double doors as the incoming one comes forward, with a floor reflection
// Tags: doors, 3d, reflection
// @param Strength of the reflection
uniform float reflection; // = 0.4
// @param Amount of perspective
uniform float perspective; // = 0.4
uniform float depth; // = 3

const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec2 project (vec2 p) {
  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);
}

vec4 bgColor (vec2 p, vec2 pto) {
  vec4 c = black;
  pto = project(pto);
  if (inBounds(pto)) {
    c += mix(black, getToColor(pto), reflection * mix(1.0, 0.0, pto.y));
  }
  return c;
}


vec4 transition (vec2 p) {
  vec2 pfr = vec2(-1.), pto = vec2(-1.);
  float middleSlit = 2.0 * abs(p.x-0.5) - progress;
  if (middleSlit > 0.0) {
    pfr = p + (p.x > 0.5 ? -1.0 : 1.0) * vec2(0.5*progress, 0.0);
    float d = 1.0/(1.0+perspective*progress*(1.0-middleSlit));
    pfr.y -= d/2.;
    pfr.y *= d;
    pfr.y += d/2.;
  }
  float size = mix(1.0, depth, 1.-progress);
  pto = (p + vec2(-0.5, -0.5)) * vec2(size, size) + vec2(0.5, 0.5);
  if (inBounds(pfr)) {
    return getFromColor(pfr);
  }
  else if (inBounds(pto)) {
    return getToColor(pto);
  }
  else {
    return bgColor(p, pto);
  }
}
`,author:`gre`,license:`MIT`,description:`The outgoing image opens like double doors as the incoming one comes forward, with a floor reflection`,tags:[`doors`,`3d`,`reflection`],params:{reflection:{type:`float`,default:.4,description:`Strength of the reflection`},perspective:{type:`float`,default:.4,description:`Amount of perspective`},depth:{type:`float`,default:3}},textures:[],createdAt:`Sat, 20 May 2017 19:28:26 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`fade`,paramsTypes:{},defaultParams:{},glsl:`// Author: gre
// License: MIT
// Description: A linear crossfade between the two images
// Tags: fade, blend

vec4 transition (vec2 uv) {
  return mix(
    getFromColor(uv),
    getToColor(uv),
    progress
  );
}
`,author:`gre`,license:`MIT`,description:`A linear crossfade between the two images`,tags:[`fade`,`blend`],params:{},textures:[],createdAt:`Sat, 20 May 2017 19:28:26 +0200`,updatedAt:`Fri, 9 Oct 2026 22:46:55 +0200`},{name:`fadecolor`,paramsTypes:{color:`vec3`,colorPhase:`float`},defaultParams:{color:[0,0,0],colorPhase:.4},glsl:`// Author: gre
// License: MIT
// Description: A fade through a solid color, black by default
// Tags: fade, color
// @color Color to fade through
uniform vec3 color;// = vec3(0.0)
// @range(0, 1) How long the color shows in the middle
uniform float colorPhase; // = 0.4 ; // if 0.0, there is no black phase, if 0.9, the black phase is very important
vec4 transition (vec2 uv) {
  return mix(
    mix(vec4(color, 1.0), getFromColor(uv), smoothstep(1.0-colorPhase, 0.0, progress)),
    mix(vec4(color, 1.0), getToColor(uv), smoothstep(    colorPhase, 1.0, progress)),
    progress);
}
`,author:`gre`,license:`MIT`,description:`A fade through a solid color, black by default`,tags:[`fade`,`color`],params:{color:{type:`vec3`,default:[0,0,0],color:!0,description:`Color to fade through`},colorPhase:{type:`float`,default:.4,min:0,max:1,description:`How long the color shows in the middle`}},textures:[],createdAt:`Sat, 20 May 2017 19:28:26 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`fadegrayscale`,paramsTypes:{intensity:`float`},defaultParams:{intensity:.3},glsl:`// Author: gre
// License: MIT
// Description: A crossfade through grayscale
// Tags: fade, grayscale, color

// @range(0, 1) How long the grayscale phase lasts
uniform float intensity; // = 0.3; // if 0.0, the image directly turn grayscale, if 0.9, the grayscale transition phase is very important
 
vec3 grayscale (vec3 color) {
  return vec3(0.2126*color.r + 0.7152*color.g + 0.0722*color.b);
}
 
vec4 transition (vec2 uv) {
  vec4 fc = getFromColor(uv);
  vec4 tc = getToColor(uv);
  return mix(
    mix(vec4(grayscale(fc.rgb), 1.0), fc, smoothstep(1.0-intensity, 0.0, progress)),
    mix(vec4(grayscale(tc.rgb), 1.0), tc, smoothstep(    intensity, 1.0, progress)),
    progress);
}
`,author:`gre`,license:`MIT`,description:`A crossfade through grayscale`,tags:[`fade`,`grayscale`,`color`],params:{intensity:{type:`float`,default:.3,min:0,max:1,description:`How long the grayscale phase lasts`}},textures:[],createdAt:`Fri, 26 May 2017 09:52:33 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`flyeye`,paramsTypes:{size:`float`,zoom:`float`,colorSeparation:`float`},defaultParams:{size:.04,zoom:50,colorSeparation:.3},glsl:`// Author: gre
// License: MIT
// Description: The image breaks into a fly's-eye grid of lenses with color separation
// Tags: lens, distort, chromatic
uniform float size; // = 0.04
uniform float zoom; // = 50.0
uniform float colorSeparation; // = 0.3

vec4 transition(vec2 p) {
  float inv = 1. - progress;
  vec2 disp = size*vec2(cos(zoom*p.x), sin(zoom*p.y));
  vec4 texTo = getToColor(p + inv*disp);
  vec4 texFrom = vec4(
    getFromColor(p + progress*disp*(1.0 - colorSeparation)).r,
    getFromColor(p + progress*disp).g,
    getFromColor(p + progress*disp*(1.0 + colorSeparation)).b,
    1.0);
  return texTo*progress + texFrom*inv;
}
`,author:`gre`,license:`MIT`,description:`The image breaks into a fly's-eye grid of lenses with color separation`,tags:[`lens`,`distort`,`chromatic`],params:{size:{type:`float`,default:.04},zoom:{type:`float`,default:50},colorSeparation:{type:`float`,default:.3}},textures:[],createdAt:`Sat, 27 May 2017 11:34:46 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`fragment`,paramsTypes:{},defaultParams:{},glsl:`// Author: lbl
// License: MIT
// Description: The outgoing image shatters into fragments that fly away
// Tags: shatter, fragments

#define POINTS 10

float random(vec2 par) {
    return fract(sin(dot(par.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 random2(vec2 par) {
    float rand = random(par);
    return vec2(rand, random(par + rand));
}

vec4 transition (vec2 uv) {
    if (progress <= 0.0) return getFromColor(uv);
    if (progress >= 1.0) return getToColor(uv);

    const float duration = 8.0;
    float time = progress * duration;
    vec2 point[POINTS];
    for (int i = 0; i < POINTS; i++) {
        point[i] = random2(vec2(float(i)));
    }

    vec4 col = getToColor(uv);

    for (int i = 0; i < POINTS; i++) {
        vec2 dir = normalize(random2(vec2(float(i), float(i) + 11.)));
        float v = (1.0 + random(dir) * 0.5) * 0.2;
        vec2 ofst = dir * clamp(time - 0.5, 0.0, duration) * v;
        vec2 U = uv - ofst;

        if (U.x < 0.0 || U.x > 1.0 || U.y < 0.0 || U.y > 1.0) continue;

        float dist_i = distance(U, point[i]);
        bool closest = true;
        for (int j = 0; j < POINTS; j++) {
            if (distance(U, point[j]) < dist_i) {
                closest = false;
                break;
            }
        }

        if (closest) {
            col = getFromColor(U);
            break;
        }
    }
    return col;
}
`,author:`lbl`,license:`MIT`,description:`The outgoing image shatters into fragments that fly away`,tags:[`shatter`,`fragments`],params:{},textures:[],createdAt:`Thu, 4 Jul 2024 15:10:28 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`heart`,paramsTypes:{},defaultParams:{},glsl:`// Author: gre
// License: MIT
// Description: A heart shape grows from the center to reveal the incoming image
// Tags: shape, wipe, heart

float inHeart (vec2 p, vec2 center, float size) {
  if (size==0.0) return 0.0;
  vec2 o = (p-center)/(1.6*size);
  float a = o.x*o.x+o.y*o.y-0.3;
  return step(a*a*a, o.x*o.x*o.y*o.y*o.y);
}
vec4 transition (vec2 uv) {
  return mix(
    getFromColor(uv),
    getToColor(uv),
    inHeart(uv, vec2(0.5, 0.4), progress)
  );
}
`,author:`gre`,license:`MIT`,description:`A heart shape grows from the center to reveal the incoming image`,tags:[`shape`,`wipe`,`heart`],params:{},textures:[],createdAt:`Fri, 26 May 2017 12:22:53 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`hexagonalize`,paramsTypes:{steps:`int`,horizontalHexagons:`float`},defaultParams:{steps:50,horizontalHexagons:20},glsl:`// Author: Fernando Kuteken
// License: MIT
// Description: Both images turn into hexagons, crossfade, then sharpen again
// Tags: pixelate, hexagon, blend
// Hexagonal math from: http://www.redblobgames.com/grids/hexagons/

uniform int steps; // = 50
// @param Number of hexagons across
uniform float horizontalHexagons; // = 20

struct Hexagon {
  float q;
  float r;
  float s;
};

Hexagon createHexagon(float q, float r){
  Hexagon hex;
  hex.q = q;
  hex.r = r;
  hex.s = -q - r;
  return hex;
}

Hexagon roundHexagon(Hexagon hex){
  
  float q = floor(hex.q + 0.5);
  float r = floor(hex.r + 0.5);
  float s = floor(hex.s + 0.5);

  float deltaQ = abs(q - hex.q);
  float deltaR = abs(r - hex.r);
  float deltaS = abs(s - hex.s);

  if (deltaQ > deltaR && deltaQ > deltaS)
    q = -r - s;
  else if (deltaR > deltaS)
    r = -q - s;
  else
    s = -q - r;

  return createHexagon(q, r);
}

Hexagon hexagonFromPoint(vec2 point, float size) {
  
  point.y /= ratio;
  point = (point - 0.5) / size;
  
  float q = (sqrt(3.0) / 3.0) * point.x + (-1.0 / 3.0) * point.y;
  float r = 0.0 * point.x + 2.0 / 3.0 * point.y;

  Hexagon hex = createHexagon(q, r);
  return roundHexagon(hex);
  
}

vec2 pointFromHexagon(Hexagon hex, float size) {
  
  float x = (sqrt(3.0) * hex.q + (sqrt(3.0) / 2.0) * hex.r) * size + 0.5;
  float y = (0.0 * hex.q + (3.0 / 2.0) * hex.r) * size + 0.5;
  
  return vec2(x, y * ratio);
}

vec4 transition (vec2 uv) {
  
  float dist = 2.0 * min(progress, 1.0 - progress);
  dist = steps > 0 ? ceil(dist * float(steps)) / float(steps) : dist;
  
  float size = (sqrt(3.0) / 3.0) * dist / horizontalHexagons;
  
  vec2 point = dist > 0.0 ? pointFromHexagon(hexagonFromPoint(uv, size), size) : uv;

  return mix(getFromColor(point), getToColor(point), progress);
  
}
`,author:`Fernando Kuteken`,license:`MIT`,description:`Both images turn into hexagons, crossfade, then sharpen again`,tags:[`pixelate`,`hexagon`,`blend`],params:{steps:{type:`int`,default:50},horizontalHexagons:{type:`float`,default:20,description:`Number of hexagons across`}},textures:[],createdAt:`Tue, 30 May 2017 21:55:47 -0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`kaleidoscope`,paramsTypes:{speed:`float`,angle:`float`,power:`float`},defaultParams:{speed:1,angle:1,power:1.5},glsl:`// Author: nwoeanhinnogaehr
// License: MIT
// Description: A crossfade through a spinning kaleidoscope
// Tags: kaleidoscope, distort, blend

uniform float speed; // = 1.0
uniform float angle; // = 1.0
uniform float power; // = 1.5

vec4 transition(vec2 uv) {
  vec2 p = uv.xy / vec2(1.0).xy;
  vec2 q = p;
  float t = pow(progress, power)*speed;
  p = p -0.5;
  for (int i = 0; i < 7; i++) {
    p = vec2(sin(t)*p.x + cos(t)*p.y, sin(t)*p.y - cos(t)*p.x);
    t += angle;
    p = abs(mod(p, 2.0) - 1.0);
  }
  abs(mod(p, 1.0));
  return mix(
    mix(getFromColor(q), getToColor(q), progress),
    mix(getFromColor(p), getToColor(p), progress), 1.0 - 2.0*abs(progress - 0.5));
}
`,author:`nwoeanhinnogaehr`,license:`MIT`,description:`A crossfade through a spinning kaleidoscope`,tags:[`kaleidoscope`,`distort`,`blend`],params:{speed:{type:`float`,default:1},angle:{type:`float`,default:1},power:{type:`float`,default:1.5}},textures:[],createdAt:`Wed, 31 May 2017 21:48:26 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`luma`,paramsTypes:{},defaultParams:{},glsl:`// Author: gre
// License: MIT
// Description: A wipe that follows the brightness of a grayscale mask (the luma texture)
// Tags: wipe, luma, mask

uniform sampler2D luma;

vec4 transition(vec2 uv) {
  return mix(
    getToColor(uv),
    getFromColor(uv),
    step(progress, texture2D(luma, uv).r)
  );
}
`,author:`gre`,license:`MIT`,description:`A wipe that follows the brightness of a grayscale mask (the luma texture)`,tags:[`wipe`,`luma`,`mask`],params:{},textures:[`luma`],createdAt:`Fri, 26 May 2017 21:30:20 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`luminance_melt`,paramsTypes:{direction:`bool`,l_threshold:`float`,above:`bool`},defaultParams:{direction:!0,l_threshold:.8,above:!1},glsl:`// Author: 0gust1
// License: MIT
// Description: The outgoing image melts away in noisy vertical streaks, depending on its brightness
// Tags: melt, noise, luma
//My own first transition — based on crosshatch code (from pthrasher), using  simplex noise formula (copied and pasted)
//-> cooler with high contrasted images (isolated dark subject on light background f.e.)
//TODO : try to rebase it on DoomTransition (from zeh)?
//optimizations :
//luminance (see http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color#answer-596241)
// Y = (R+R+B+G+G+G)/6
//or Y = (R+R+R+B+G+G+G+G)>>3 


//direction of movement :  0 : up, 1, down
// @param Direction of the melt (false: up, true: down)
uniform bool direction; // = true
//luminance threshold
// @range(0, 1) Luminance threshold
uniform float l_threshold; // = 0.8 
//does the movement takes effect above or below luminance threshold ?
// @param Melt the parts above the threshold instead of below
uniform bool above; // = false 


//Random function borrowed from everywhere
float rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


// Simplex noise :
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : MIT  
//               2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
		+ i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Simplex noise -- end

float luminance(vec4 color){
  //(0.299*R + 0.587*G + 0.114*B)
  return color.r*0.299+color.g*0.587+color.b*0.114;
}

vec4 transition(vec2 uv) {
  vec2 center = vec2(1.0, direction);
  vec2 p = uv.xy / vec2(1.0).xy;
  if (progress == 0.0) {
    return getFromColor(p);
  } else if (progress == 1.0) {
    return getToColor(p);
  } else {
    float x = progress;
    float dist = distance(center, p)- progress*exp(snoise(vec2(p.x, 0.0)));
    float r = x - rand(vec2(p.x, 0.1));
    float m;
    if(above){
     m = dist <= r && luminance(getFromColor(p))>l_threshold ? 1.0 : (progress*progress*progress);
    }
    else{
     m = dist <= r && luminance(getFromColor(p))<l_threshold ? 1.0 : (progress*progress*progress);  
    }
    return mix(getFromColor(p), getToColor(p), m);    
  }
}
`,author:`0gust1`,license:`MIT`,description:`The outgoing image melts away in noisy vertical streaks, depending on its brightness`,tags:[`melt`,`noise`,`luma`],params:{direction:{type:`bool`,default:!0,description:`Direction of the melt (false: up, true: down)`},l_threshold:{type:`float`,default:.8,min:0,max:1,description:`Luminance threshold`},above:{type:`bool`,default:!1,description:`Melt the parts above the threshold instead of below`}},textures:[],createdAt:`Wed, 24 Jan 2018 19:02:32 +0100`,updatedAt:`Sat, 10 Oct 2026 11:13:38 +0200`},{name:`morph`,paramsTypes:{strength:`float`},defaultParams:{strength:.1},glsl:`// Author: paniq
// License: MIT
// Description: A crossfade in which each image is displaced by the other's colors, like a morph
// Tags: morph, distort, blend
// @param Strength of the displacement
uniform float strength; // = 0.1

vec4 transition(vec2 p) {
  vec4 ca = getFromColor(p);
  vec4 cb = getToColor(p);
  
  vec2 oa = (((ca.rg+ca.b)*0.5)*2.0-1.0);
  vec2 ob = (((cb.rg+cb.b)*0.5)*2.0-1.0);
  vec2 oc = mix(oa,ob,0.5)*strength;
  
  float w0 = progress;
  float w1 = 1.0-w0;
  return mix(getFromColor(p+oc*w0), getToColor(p-oc*w1), progress);
}
`,author:`paniq`,license:`MIT`,description:`A crossfade in which each image is displaced by the other's colors, like a morph`,tags:[`morph`,`distort`,`blend`],params:{strength:{type:`float`,default:.1,description:`Strength of the displacement`}},textures:[],createdAt:`Thu, 10 Aug 2017 00:27:36 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`mosaic_transition`,paramsTypes:{mosaicNum:`float`},defaultParams:{mosaicNum:10},glsl:`// Author: YueDev
// License: MIT
// Description: Both images break into mosaic blocks that blend, then sharpen into the incoming image
// Tags: mosaic, pixelate, blend

// @param Number of mosaic blocks
uniform float mosaicNum;// = 10.0

vec2 getMosaicUV(vec2 uv) {
  float mosaicWidth = 2.0 / mosaicNum * min(progress, 1.0 - progress);
  float mX = floor(uv.x / mosaicWidth) + 0.5;
  float mY = floor(uv.y / mosaicWidth) + 0.5;
  return vec2(mX * mosaicWidth, mY * mosaicWidth);
}

vec4 transition (vec2 uv) {
  vec2 mosaicUV = min(progress, 1.0 - progress) == 0.0 ? uv : getMosaicUV(uv);
  return mix(getFromColor(mosaicUV), getToColor(mosaicUV), progress * progress);
}
`,author:`YueDev`,license:`MIT`,description:`Both images break into mosaic blocks that blend, then sharpen into the incoming image`,tags:[`mosaic`,`pixelate`,`blend`],params:{mosaicNum:{type:`float`,default:10,description:`Number of mosaic blocks`}},textures:[],createdAt:`Fri, 27 May 2022 19:14:24 +0800`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`multiply_blend`,paramsTypes:{},defaultParams:{},glsl:`// Author: Fernando Kuteken
// License: MIT
// Description: A crossfade through the multiplied blend of both images
// Tags: blend, fade

vec4 blend(vec4 a, vec4 b) {
  return a * b;
}

vec4 transition (vec2 uv) {
  
  vec4 blended = blend(getFromColor(uv), getToColor(uv));
  
  if (progress < 0.5)
    return mix(getFromColor(uv), blended, 2.0 * progress);
  else
    return mix(blended, getToColor(uv), 2.0 * progress - 1.0);
}

`,author:`Fernando Kuteken`,license:`MIT`,description:`A crossfade through the multiplied blend of both images`,tags:[`blend`,`fade`],params:{},textures:[],createdAt:`Mon, 29 May 2017 17:13:58 -0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`old_tv_lost_signal`,paramsTypes:{},defaultParams:{},glsl:`// Author: mernking (gitlab.com/Godswork)
// License: MIT
// Description: A crossfade with drifting tracking lines and tearing, like a TV losing its signal
// Tags: retro, glitch, scanlines

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 transition(vec2 uv) {

    float p = progress;
    float strength = sin(p * 3.14159265);

    vec2 tv = uv;

    vec4 fromColor = getFromColor(tv);
    vec4 toColor   = getToColor(tv);

    vec4 color = mix(fromColor, toColor, p);

    // horizontal tracking lines (key effect)
    float lineY = floor(tv.y * 120.0);

    float noise = hash(vec2(lineY, p * 20.0));

    float line = step(0.92, noise);

    // make lines drift during transition
    float drift =
        sin(tv.y * 30.0 + p * 10.0)
        * 0.02
        * strength;

    vec4 shiftedFrom = getFromColor(tv + vec2(drift, 0.0));
    vec4 shiftedTo   = getToColor(tv + vec2(drift, 0.0));

    vec4 lineColor = mix(shiftedFrom, shiftedTo, p);

    // apply tearing only on selected scanlines
    color = mix(color, lineColor, line * strength);

    // mild scanline darkening (CRT feel)
    float scan =
        sin(tv.y * 900.0) * 0.03;

    color.rgb -= scan * strength;

    return color;
}
`,author:`mernking (gitlab.com/Godswork)`,license:`MIT`,description:`A crossfade with drifting tracking lines and tearing, like a TV losing its signal`,tags:[`retro`,`glitch`,`scanlines`],params:{},textures:[],createdAt:`Mon, 22 Jun 2026 00:33:17 +0100`,updatedAt:`Sat, 10 Oct 2026 11:13:38 +0200`},{name:`parametric_glitch`,paramsTypes:{ampx:`float`,ampy:`float`},defaultParams:{ampx:1,ampy:1},glsl:`// Author: Yoni Maltsman @friendlyspinach
// License: MIT
// Description: A crossfade with glitchy horizontal bands and color shifts
// Tags: glitch, blend



// @param Horizontal amplitude of the glitch
uniform float ampx; // =1.0
// @param Vertical amplitude of the glitch
uniform float ampy; //=1.0

vec4 transition (vec2 uv) {
  vec4 from = getFromColor(uv);
  vec4 to = getToColor(uv);
  float r = from.r;
  float g = from.g;
  float b = from.b;
  float sphere = r*r + g*g + b*b - 1.0; //3 to 1
  float spiralX = cos(sphere - uv.x/(progress + .01));
  float spiralY = sin(sphere - uv.y/(progress+.01));
  vec2 st = uv;
  st.x = fract(ampx*st.x*spiralX); //1 to 2
  st.y = fract(ampy*st.y*spiralY);
  vec2 diff = uv - st;
  from = getFromColor(uv + progress*diff);
  return mix(from, to, progress);
}
`,author:`Yoni Maltsman @friendlyspinach`,license:`MIT`,description:`A crossfade with glitchy horizontal bands and color shifts`,tags:[`glitch`,`blend`],params:{ampx:{type:`float`,default:1,description:`Horizontal amplitude of the glitch`},ampy:{type:`float`,default:1,description:`Vertical amplitude of the glitch`}},textures:[],createdAt:`Sat, 22 Jun 2024 13:22:34 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`perlin`,paramsTypes:{scale:`float`,smoothness:`float`,seed:`float`},defaultParams:{scale:4,smoothness:.01,seed:12.9898},glsl:`// Author: Rich Harris
// License: MIT
// Description: The incoming image appears through blobs of Perlin noise
// Tags: noise, dissolve

// @param Scale of the noise; higher values make smaller blobs
uniform float scale; // = 4.0
// @param Softness of the blob edges
uniform float smoothness; // = 0.01

// @param Random seed
uniform float seed; // = 12.9898

// http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
float random(vec2 co)
{
    float a = seed;
    float b = 78.233;
    float c = 43758.5453;
    float dt= dot(co.xy ,vec2(a,b));
    float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    vec2 u = f*f*(3.0-2.0*f);
    // u = smoothstep(0.,1.,f);

    // Mix 4 coorners porcentages
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

vec4 transition (vec2 uv) {
  vec4 from = getFromColor(uv);
  vec4 to = getToColor(uv);
  float n = noise(uv * scale);

  float p = mix(-smoothness, 1.0 + smoothness, progress);
  float lower = p - smoothness;
  float higher = p + smoothness;

  float q = smoothstep(lower, higher, n);

  return mix(
    from,
    to,
    1.0 - q
  );
}
`,author:`Rich Harris`,license:`MIT`,description:`The incoming image appears through blobs of Perlin noise`,tags:[`noise`,`dissolve`],params:{scale:{type:`float`,default:4,description:`Scale of the noise; higher values make smaller blobs`},smoothness:{type:`float`,default:.01,description:`Softness of the blob edges`},seed:{type:`float`,default:12.9898,description:`Random seed`}},textures:[],createdAt:`Tue, 23 Jan 2018 21:35:10 -0500`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`pinwheel`,paramsTypes:{speed:`float`},defaultParams:{speed:2},glsl:`// Author: Mr Speaker
// License: MIT
// Description: A spinning pinwheel reveals the incoming image
// Tags: pinwheel, radial, rotate

// @param Rotation speed
uniform float speed; // = 2.0

vec4 transition(vec2 uv) {
  
  vec2 p = uv.xy / vec2(1.0).xy;
  
  float circPos = atan(p.y - 0.5, p.x - 0.5) + progress * speed;
  float modPos = mod(circPos, 3.1415 / 4.);
  float signed = sign(progress - modPos);
  
  return mix(getToColor(p), getFromColor(p), step(signed, 0.5));
  
}
`,author:`Mr Speaker`,license:`MIT`,description:`A spinning pinwheel reveals the incoming image`,tags:[`pinwheel`,`radial`,`rotate`],params:{speed:{type:`float`,default:2,description:`Rotation speed`}},textures:[],createdAt:`Tue, 30 May 2017 09:04:31 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`pixelize`,paramsTypes:{squaresMin:`ivec2`,steps:`int`},defaultParams:{squaresMin:[20,20],steps:50},glsl:`// Author: gre
// License: MIT
// Description: Both images pixelate, crossfade, then sharpen again
// Tags: pixelate, blend
// forked from https://gist.github.com/benraziel/c528607361d90a072e98

// minimum number of squares (when the effect is at its higher level)
// @param Number of squares at the strongest pixelation
uniform ivec2 squaresMin; // = ivec2(20)
// zero disable the stepping
// @param Number of pixelation steps; 0 for a continuous effect
uniform int steps; // = 50

vec4 transition(vec2 uv) {
  float d = min(progress, 1.0 - progress);
  float dist = steps>0 ? ceil(d * float(steps)) / float(steps) : d;
  vec2 squareSize = 2.0 * dist / vec2(squaresMin);
  vec2 p = dist>0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv;
  return mix(getFromColor(p), getToColor(p), progress);
}
`,author:`gre`,license:`MIT`,description:`Both images pixelate, crossfade, then sharpen again`,tags:[`pixelate`,`blend`],params:{squaresMin:{type:`ivec2`,default:[20,20],description:`Number of squares at the strongest pixelation`},steps:{type:`int`,default:50,description:`Number of pixelation steps; 0 for a continuous effect`}},textures:[],createdAt:`Mon, 29 May 2017 11:16:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`polar_function`,paramsTypes:{segments:`int`},defaultParams:{segments:5},glsl:`// Author: Fernando Kuteken
// License: MIT
// Description: A flower shape with several petals grows to reveal the incoming image
// Tags: shape, wipe, polar

#define PI 3.14159265359

// @param Number of petals
uniform int segments; // = 5

vec4 transition (vec2 uv) {
  
  float angle = atan(uv.y - 0.5, uv.x - 0.5) - 0.5 * PI;
  float normalized = (angle + 1.5 * PI) * (2.0 * PI);
  
  float radius = (cos(float(segments) * angle) + 4.0) / 4.0;
  float difference = length(uv - vec2(0.5, 0.5));
  
  if (difference > radius * progress)
    return getFromColor(uv);
  else
    return getToColor(uv);
}
`,author:`Fernando Kuteken`,license:`MIT`,description:`A flower shape with several petals grows to reveal the incoming image`,tags:[`shape`,`wipe`,`polar`],params:{segments:{type:`int`,default:5,description:`Number of petals`}},textures:[],createdAt:`Sun, 28 May 2017 18:53:12 -0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`powerKaleido`,paramsTypes:{scale:`float`,z:`float`,speed:`float`},defaultParams:{scale:2,z:1.5,speed:5},glsl:`// Name: Power Kaleido
// Author: Boundless
// License: MIT
// Description: The image folds into an animated kaleidoscope before revealing the incoming one
// Tags: kaleidoscope, distort
#define PI 3.14159265358979
const float rad = 120.; // change this value to get different mirror effects
const float deg = rad / 180. * PI;
uniform float scale; // = 2.0
uniform float z; // = 1.5
uniform float speed; // = 5.
vec2 refl(vec2 p,vec2 o,vec2 n)
{
	return 2.0*o+2.0*n*dot(p-o,n)-p;
}

vec2 rot(vec2 p, vec2 o, float a)
{
    float s = sin(a);
    float c = cos(a);
	return o + mat2(c, -s, s, c) * (p - o);
}

vec4 mainImage(vec2 uv)
{
  float dist = scale / 10.;
  vec2 uv0 = uv;
	uv -= 0.5;
  uv.x *= ratio;
  uv *= z;
  uv = rot(uv, vec2(0.0), progress*speed);
  // uv.x = fract(uv.x/l/3.0)*l*3.0;
	float theta = progress*6.+PI/.5;
	for(int iter = 0; iter < 10; iter++) {
    for(float i = 0.; i < 2. * PI; i+=deg) {
	    float ts = sign(asin(cos(i))) == 1.0 ? 1.0 : 0.0;
      if(((ts == 1.0) && (uv.y-dist*cos(i) > tan(i)*(uv.x+dist*+sin(i)))) || ((ts == 0.0) && (uv.y-dist*cos(i) < tan(i)*(uv.x+dist*+sin(i))))) {
        uv = refl(vec2(uv.x+sin(i)*dist*2.,uv.y-cos(i)*dist*2.), vec2(0.,0.), vec2(cos(i),sin(i)));
      }
    }
  }
  uv += 0.5;
  uv = rot(uv, vec2(0.5), progress*-speed);
  uv -= 0.5;
  uv.x /= ratio;
  uv += 0.5;
  uv = 2.*abs(uv/2.-floor(uv/2.+0.5));
  vec2 uvMix = mix(uv,uv0,cos(progress*PI*2.)/2.+0.5);
  vec4 color = mix(getFromColor(uvMix),getToColor(uvMix),cos((progress-1.)*PI)/2.+0.5);
	return color;
    
}
vec4 transition (vec2 uv) {
  vec4 color = mainImage(uv);
  return color;
}
`,author:`Boundless`,license:`MIT`,description:`The image folds into an animated kaleidoscope before revealing the incoming one`,tags:[`kaleidoscope`,`distort`],params:{scale:{type:`float`,default:2},z:{type:`float`,default:1.5},speed:{type:`float`,default:5}},textures:[],createdAt:`Tue, 15 Mar 2022 07:18:34 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`randomNoisex`,paramsTypes:{},defaultParams:{},glsl:`// Author: towrabbit
// License: MIT
// Description: The incoming image appears pixel by pixel in random noise
// Tags: dissolve, noise

float random (vec2 st) {
    return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
}
vec4 transition (vec2 uv) {
  vec4 leftSide = getFromColor(uv);
  vec4 rightSide = getToColor(uv);
  float uvz = floor(random(uv)+progress);
  return mix(leftSide,rightSide,uvz);
}
`,author:`towrabbit`,license:`MIT`,description:`The incoming image appears pixel by pixel in random noise`,tags:[`dissolve`,`noise`],params:{},textures:[],createdAt:`Wed, 28 Oct 2020 15:02:19 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`randomsquares`,paramsTypes:{size:`ivec2`,smoothness:`float`},defaultParams:{size:[10,10],smoothness:.5},glsl:`// Author: gre
// License: MIT
// Description: The incoming image appears in random squares
// Tags: squares, grid, dissolve

// @param Number of squares (columns, rows)
uniform ivec2 size; // = ivec2(10, 10)
// @param Softness of each square's switch
uniform float smoothness; // = 0.5
 
float rand (vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 transition(vec2 p) {
  float r = rand(floor(vec2(size) * p));
  float m = smoothstep(0.0, -smoothness, r - (progress * (1.0 + smoothness)));
  return mix(getFromColor(p), getToColor(p), m);
}
`,author:`gre`,license:`MIT`,description:`The incoming image appears in random squares`,tags:[`squares`,`grid`,`dissolve`],params:{size:{type:`ivec2`,default:[10,10],description:`Number of squares (columns, rows)`},smoothness:{type:`float`,default:.5,description:`Softness of each square's switch`}},textures:[],createdAt:`Sat, 27 May 2017 11:31:45 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`ripple`,paramsTypes:{amplitude:`float`,speed:`float`},defaultParams:{amplitude:100,speed:50},glsl:`// Author: gre
// License: MIT
// Description: Ripples spread from the center while crossfading
// Tags: ripple, wave, blend
// @param Frequency of the ripples
uniform float amplitude; // = 100.0
// @param Speed of the ripples
uniform float speed; // = 50.0

vec4 transition (vec2 uv) {
  vec2 dir = uv - vec2(.5);
  float dist = length(dir);
  vec2 offset = dir * (sin(progress * dist * amplitude - progress * speed) + .5) / 30. * progress;
  return mix(
    getFromColor(uv + offset),
    getToColor(uv),
    smoothstep(0.2, 1.0, progress)
  );
}
`,author:`gre`,license:`MIT`,description:`Ripples spread from the center while crossfading`,tags:[`ripple`,`wave`,`blend`],params:{amplitude:{type:`float`,default:100,description:`Frequency of the ripples`},speed:{type:`float`,default:50,description:`Speed of the ripples`}},textures:[],createdAt:`Fri, 26 May 2017 12:25:18 +0200`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`rotateTransition`,paramsTypes:{},defaultParams:{},glsl:`// Author: haiyoucuv
// License: MIT
// Description: The images spin around the center while crossfading
// Tags: rotate, spin, blend

#define PI 3.1415926

vec2 rotate2D(in vec2 uv, in float angle){
  
  return uv * mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}
vec4 transition (vec2 uv) {
  
  vec2 p = fract(rotate2D(uv - 0.5, progress * PI * 2.0) + 0.5);

  return mix(
    getFromColor(p),
    getToColor(p),
    progress
  );
}
`,author:`haiyoucuv`,license:`MIT`,description:`The images spin around the center while crossfading`,tags:[`rotate`,`spin`,`blend`],params:{},textures:[],createdAt:`Thu, 25 Mar 2021 16:48:22 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`rotate_scale_fade`,paramsTypes:{center:`vec2`,rotations:`float`,scale:`float`,backColor:`vec4`},defaultParams:{center:[.5,.5],rotations:1,scale:8,backColor:[.15,.15,.15,1]},glsl:`// Author: Fernando Kuteken
// License: MIT
// Description: The outgoing image spins and zooms while fading to the incoming one, over a background color
// Tags: rotate, zoom, fade

#define PI 3.14159265359

// @param Center of the rotation
uniform vec2 center; // = vec2(0.5, 0.5)
// @param Number of turns
uniform float rotations; // = 1
// @param Maximum zoom
uniform float scale; // = 8
// @color Background color
uniform vec4 backColor; // = vec4(0.15, 0.15, 0.15, 1.0)

vec4 transition (vec2 uv) {
  
  vec2 difference = uv - center;
  vec2 dir = normalize(difference);
  float dist = length(difference);
  
  float angle = 2.0 * PI * rotations * progress;
  
  float c = cos(angle);
  float s = sin(angle);
  
  float currentScale = mix(scale, 1.0, 2.0 * abs(progress - 0.5));
  
  vec2 rotatedDir = vec2(dir.x  * c - dir.y * s, dir.x * s + dir.y * c);
  vec2 rotatedUv = center + rotatedDir * dist / currentScale;
  
  if (rotatedUv.x < 0.0 || rotatedUv.x > 1.0 ||
      rotatedUv.y < 0.0 || rotatedUv.y > 1.0)
    return backColor;
    
  return mix(getFromColor(rotatedUv), getToColor(rotatedUv), progress);
}
`,author:`Fernando Kuteken`,license:`MIT`,description:`The outgoing image spins and zooms while fading to the incoming one, over a background color`,tags:[`rotate`,`zoom`,`fade`],params:{center:{type:`vec2`,default:[.5,.5],description:`Center of the rotation`},rotations:{type:`float`,default:1,description:`Number of turns`},scale:{type:`float`,default:8,description:`Maximum zoom`},backColor:{type:`vec4`,default:[.15,.15,.15,1],color:!0,description:`Background color`}},textures:[],createdAt:`Mon, 29 May 2017 18:25:00 -0300`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`scale-in`,paramsTypes:{},defaultParams:{},glsl:`// Author: haiyoucuv
// License: MIT
// Description: The incoming image scales in from the center while fading in
// Tags: zoom, fade

vec4 scale(in vec2 uv){
    uv = 0.5 + (uv - 0.5) * progress;
    return getToColor(uv);
}

vec4 transition (vec2 uv) {
  return mix(
    getFromColor(uv),
    scale(uv),
    progress
  );
}
`,author:`haiyoucuv`,license:`MIT`,description:`The incoming image scales in from the center while fading in`,tags:[`zoom`,`fade`],params:{},textures:[],createdAt:`Tue, 15 Mar 2022 20:21:46 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`splitSlideInHorizontal`,paramsTypes:{reverse:`bool`},defaultParams:{reverse:!1},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: The incoming image slides in as two halves moving horizontally in opposite directions
// Tags: slide, split, horizontal

// @param Swap the directions of the halves
uniform bool reverse; // = false

const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
  float modifier = reverse ? -1.0 : 1.0;
  vec2 toP = (uv.y > 0.5) ?
    vec2((uv.x - (progress * modifier)) + modifier, uv.y) :
    vec2((uv.x + (progress * modifier)) - modifier, uv.y);

  vec2 fromP = uv;

  return inBounds(toP) ? getToColor(toP) : getFromColor(fromP);
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`The incoming image slides in as two halves moving horizontally in opposite directions`,tags:[`slide`,`split`,`horizontal`],params:{reverse:{type:`bool`,default:!1,description:`Swap the directions of the halves`}},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`splitSlideInOutHorizontal`,paramsTypes:{reverse:`bool`},defaultParams:{reverse:!1},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: The halves of both images slide horizontally in opposite directions, out and in at once
// Tags: slide, split, horizontal

// @param Swap the directions of the halves
uniform bool reverse; // = false

const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
  float modifier = (uv.y > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;
  vec2 fromP = vec2(uv.x + (progress * modifier), uv.y);
  vec2 toP = vec2((uv.x + (progress * modifier)) - modifier, uv.y);

  return inBounds(fromP) ? getFromColor(fromP) : getToColor(toP);
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`The halves of both images slide horizontally in opposite directions, out and in at once`,tags:[`slide`,`split`,`horizontal`],params:{reverse:{type:`bool`,default:!1,description:`Swap the directions of the halves`}},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`splitSlideInOutVertical`,paramsTypes:{reverse:`bool`},defaultParams:{reverse:!1},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: The halves of both images slide vertically in opposite directions, out and in at once
// Tags: slide, split, vertical

// @param Swap the directions of the halves
uniform bool reverse; // = false

const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
  float modifier = (uv.x > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;
  vec2 fromP = vec2(uv.x, uv.y + (progress * modifier));
  vec2 toP = vec2(uv.x, (uv.y + (progress * modifier)) - modifier);

  return inBounds(fromP) ? getFromColor(fromP) : getToColor(toP);
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`The halves of both images slide vertically in opposite directions, out and in at once`,tags:[`slide`,`split`,`vertical`],params:{reverse:{type:`bool`,default:!1,description:`Swap the directions of the halves`}},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`splitSlideInVertical`,paramsTypes:{reverse:`bool`},defaultParams:{reverse:!1},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: The incoming image slides in as two halves moving vertically in opposite directions
// Tags: slide, split, vertical

// @param Swap the directions of the halves
uniform bool reverse; // = false

const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
  float modifier = reverse ? -1.0 : 1.0;
  vec2 p = (uv.x > 0.5) ?
    vec2(uv.x, (uv.y - (progress * modifier)) + modifier) :
    vec2(uv.x, (uv.y + (progress * modifier)) - modifier);

  return inBounds(p) ? getToColor(p) : getFromColor(uv);
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`The incoming image slides in as two halves moving vertically in opposite directions`,tags:[`slide`,`split`,`vertical`],params:{reverse:{type:`bool`,default:!1,description:`Swap the directions of the halves`}},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`splitSlideOutHorizontal`,paramsTypes:{reverse:`bool`},defaultParams:{reverse:!1},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: The outgoing image slides out as two halves moving horizontally in opposite directions
// Tags: slide, split, horizontal

// @param Swap the directions of the halves
uniform bool reverse; // = false

const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
  float modifier = (uv.y > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;
  vec2 p = vec2(uv.x + (progress * modifier), uv.y);

  return inBounds(p) ? getFromColor(p) : getToColor(uv);
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`The outgoing image slides out as two halves moving horizontally in opposite directions`,tags:[`slide`,`split`,`horizontal`],params:{reverse:{type:`bool`,default:!1,description:`Swap the directions of the halves`}},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`splitSlideOutVertical`,paramsTypes:{reverse:`bool`},defaultParams:{reverse:!1},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: The outgoing image slides out as two halves moving vertically in opposite directions
// Tags: slide, split, vertical

// @param Swap the directions of the halves
uniform bool reverse; // = false

const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);

bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}

vec4 transition (vec2 uv) {
  float modifier = (uv.x > 0.5 ? 1.0 : -1.0) * (reverse ? -1.0 : 1.0) ;
  vec2 p = vec2(uv.x, uv.y + (progress * modifier));

  return inBounds(p) ? getFromColor(p) : getToColor(uv);
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`The outgoing image slides out as two halves moving vertically in opposite directions`,tags:[`slide`,`split`,`vertical`],params:{reverse:{type:`bool`,default:!1,description:`Swap the directions of the halves`}},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`squareswire`,paramsTypes:{squares:`ivec2`,direction:`vec2`,smoothness:`float`},defaultParams:{squares:[10,10],direction:[1,-.5],smoothness:1.6},glsl:`// Author: gre
// License: MIT
// Description: Squares grow along a diagonal sweep to reveal the incoming image
// Tags: squares, grid, wipe, directional
 
// @param Number of squares (columns, rows)
uniform ivec2 squares;// = ivec2(10,10)
// @param Direction of the sweep
uniform vec2 direction;// = vec2(1.0, -0.5)
// @param Softness of the sweep
uniform float smoothness; // = 1.6

const vec2 center = vec2(0.5, 0.5);
vec4 transition (vec2 p) {
  vec2 v = normalize(direction);
  v /= abs(v.x)+abs(v.y);
  float d = v.x * center.x + v.y * center.y;
  float offset = smoothness;
  float pr = smoothstep(-offset, 0.0, v.x * p.x + v.y * p.y - (d-0.5+progress*(1.+offset)));
  vec2 squarep = fract(p*vec2(squares));
  vec2 squaremin = vec2(pr/2.0);
  vec2 squaremax = vec2(1.0 - pr/2.0);
  float a = (1.0 - step(progress, 0.0)) * step(squaremin.x, squarep.x) * step(squaremin.y, squarep.y) * step(squarep.x, squaremax.x) * step(squarep.y, squaremax.y);
  return mix(getFromColor(p), getToColor(p), a);
}
`,author:`gre`,license:`MIT`,description:`Squares grow along a diagonal sweep to reveal the incoming image`,tags:[`squares`,`grid`,`wipe`,`directional`],params:{squares:{type:`ivec2`,default:[10,10],description:`Number of squares (columns, rows)`},direction:{type:`vec2`,default:[1,-.5],description:`Direction of the sweep`},smoothness:{type:`float`,default:1.6,description:`Softness of the sweep`}},textures:[],createdAt:`Fri, 26 May 2017 12:48:21 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`squeeze`,paramsTypes:{colorSeparation:`float`},defaultParams:{colorSeparation:.04},glsl:`// Author: gre
// License: MIT
// Description: The outgoing image is squeezed into a line with color separation, revealing the incoming one
// Tags: squeeze, chromatic, vertical
 
// @param Amount of color separation
uniform float colorSeparation; // = 0.04
 
vec4 transition (vec2 uv) {
  float y = 0.5 + (uv.y-0.5) / (1.0-progress);
  if (y < 0.0 || y > 1.0) {
     return getToColor(uv);
  }
  else {
    vec2 fp = vec2(uv.x, y);
    vec2 off = progress * vec2(0.0, colorSeparation);
    vec4 c = getFromColor(fp);
    vec4 cn = getFromColor(fp - off);
    vec4 cp = getFromColor(fp + off);
    return vec4(cn.r, c.g, cp.b, c.a);
  }
}
`,author:`gre`,license:`MIT`,description:`The outgoing image is squeezed into a line with color separation, revealing the incoming one`,tags:[`squeeze`,`chromatic`,`vertical`],params:{colorSeparation:{type:`float`,default:.04,description:`Amount of color separation`}},textures:[],createdAt:`Fri, 26 May 2017 12:34:44 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`static_wipe`,paramsTypes:{u_transitionUpToDown:`bool`,u_max_static_span:`float`},defaultParams:{u_transitionUpToDown:!0,u_max_static_span:.5},glsl:`// Author: Ben Lucas
// License: MIT
// Description: A wipe from top to bottom with a band of TV static at its edge
// Tags: wipe, static, noise, vertical

#define PI 3.14159265359

float rnd (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(10,70)))*
        12345.5453123);
}

// @param Wipe from top to bottom; false wipes from bottom to top
uniform bool u_transitionUpToDown; // = true
// @param Maximum height of the static band
uniform float u_max_static_span; // = 0.5

vec4 transition (vec2 uv) {
  

  float span = u_max_static_span*pow(sin(PI*progress),0.5);
  
  float transitionEdge = u_transitionUpToDown ? 1.0-uv.y : uv.y;
  float mixRatio = 1.0 - step(progress, transitionEdge);

  vec4 transitionMix = mix(
    getFromColor(uv),
    getToColor(uv),
    mixRatio
  );
  
  float noiseEnvelope = smoothstep(progress-span, progress, transitionEdge) * (1.0 - smoothstep(progress, progress + span, transitionEdge));
  vec4 noise = vec4(vec3(rnd(uv*(1.0+progress))), 1.0);
  

  return mix(transitionMix, noise, noiseEnvelope);
}
`,author:`Ben Lucas`,license:`MIT`,description:`A wipe from top to bottom with a band of TV static at its edge`,tags:[`wipe`,`static`,`noise`,`vertical`],params:{u_transitionUpToDown:{type:`bool`,default:!0,description:`Wipe from top to bottom; false wipes from bottom to top`},u_max_static_span:{type:`float`,default:.5,description:`Maximum height of the static band`}},textures:[],createdAt:`Tue, 4 Apr 2023 03:29:01 -0400`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`swap`,paramsTypes:{reflection:`float`,perspective:`float`,depth:`float`},defaultParams:{reflection:.4,perspective:.2,depth:3},glsl:`// Author: gre
// License: MIT
// Description: The two images swap places in 3D, with a floor reflection
// Tags: 3d, swap, reflection
// General parameters
// @param Strength of the reflection
uniform float reflection; // = 0.4
// @param Amount of perspective
uniform float perspective; // = 0.2
uniform float depth; // = 3.0
 
const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 boundMin = vec2(0.0, 0.0);
const vec2 boundMax = vec2(1.0, 1.0);
 
bool inBounds (vec2 p) {
  return all(lessThan(boundMin, p)) && all(lessThan(p, boundMax));
}
 
vec2 project (vec2 p) {
  return p * vec2(1.0, -1.2) + vec2(0.0, -0.02);
}
 
vec4 bgColor (vec2 p, vec2 pfr, vec2 pto) {
  vec4 c = black;
  pfr = project(pfr);
  if (inBounds(pfr)) {
    c += mix(black, getFromColor(pfr), reflection * mix(1.0, 0.0, pfr.y));
  }
  pto = project(pto);
  if (inBounds(pto)) {
    c += mix(black, getToColor(pto), reflection * mix(1.0, 0.0, pto.y));
  }
  return c;
}
 
vec4 transition(vec2 p) {
  vec2 pfr, pto = vec2(-1.);
 
  float size = mix(1.0, depth, progress);
  float persp = perspective * progress;
  pfr = (p + vec2(-0.0, -0.5)) * vec2(size/(1.0-perspective*progress), size/(1.0-size*persp*p.x)) + vec2(0.0, 0.5);
 
  size = mix(1.0, depth, 1.-progress);
  persp = perspective * (1.-progress);
  pto = (p + vec2(-1.0, -0.5)) * vec2(size/(1.0-perspective*(1.0-progress)), size/(1.0-size*persp*(0.5-p.x))) + vec2(1.0, 0.5);

  if (progress < 0.5) {
    if (inBounds(pfr)) {
      return getFromColor(pfr);
    }
    if (inBounds(pto)) {
      return getToColor(pto);
    }  
  }
  if (inBounds(pto)) {
    return getToColor(pto);
  }
  if (inBounds(pfr)) {
    return getFromColor(pfr);
  }
  return bgColor(p, pfr, pto);
}
`,author:`gre`,license:`MIT`,description:`The two images swap places in 3D, with a floor reflection`,tags:[`3d`,`swap`,`reflection`],params:{reflection:{type:`float`,default:.4,description:`Strength of the reflection`},perspective:{type:`float`,default:.2,description:`Amount of perspective`},depth:{type:`float`,default:3}},textures:[],createdAt:`Sat, 27 May 2017 11:36:00 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`tangentMotionBlur`,paramsTypes:{},defaultParams:{},glsl:`
// License: MIT
// Author: chenkai
// Description: The outgoing image is flung away along a curve with motion blur
// Tags: motion-blur, rotate, slide
// ported from https://codertw.com/%E7%A8%8B%E5%BC%8F%E8%AA%9E%E8%A8%80/671116/

float rand (vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
 
// motion blur for texture from
vec4 motionBlurFrom(vec2 _st, vec2 speed) {
    vec2 texCoord = _st.xy / vec2(1.0).xy;
    vec3 color = vec3(0.0);
    float total = 0.0;
    float offset = rand(_st);
    for (float t = 0.0; t <= 20.0; t++) {
        float percent = (t + offset) / 20.0;
        float weight = 4.0 * (percent - percent * percent);
        vec2 newuv = texCoord + speed * percent;
        newuv = fract(newuv);
        color += getFromColor(newuv).rgb * weight;
        total += weight;
    }
    return vec4(color / total, 1.0);
}

// motion blur for texture to
vec4 motionBlurTo(vec2 _st, vec2 speed) {
    vec2 texCoord = _st.xy / vec2(1.0).xy;
    vec3 color = vec3(0.0);
    float total = 0.0;
    float offset = rand(_st);
    for (float t = 0.0; t <= 20.0; t++) {
        float percent = (t + offset) / 20.0;
        float weight = 4.0 * (percent - percent * percent);
        vec2 newuv = texCoord + speed * percent;
        newuv = fract(newuv);
        color += getToColor(newuv).rgb * weight;
        total += weight;
    }
    return vec4(color / total, 1.0);
}


// bezier in gpu
float A(float aA1, float aA2) {
    return 1.0 - 3.0 * aA2 + 3.0 * aA1;
}
float B(float aA1, float aA2) {
    return 3.0 * aA2 - 6.0 * aA1;
}
float C(float aA1) {
    return 3.0 * aA1;
}
float GetSlope(float aT, float aA1, float aA2) {
    return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
}
float CalcBezier(float aT, float aA1, float aA2) {
    return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;
}
float GetTForX(float aX, float mX1, float mX2) {
    // iteration to solve
    float aGuessT = aX;
    for (int i = 0; i < 4; ++i) {
        float currentSlope = GetSlope(aGuessT, mX1, mX2);
        if (currentSlope == 0.0) return aGuessT;
        float currentX = CalcBezier(aGuessT, mX1, mX2) - aX;
        aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
}
float KeySpline(float aX, float mX1, float mY1, float mX2, float mY2) {
    if (mX1 == mY1 && mX2 == mY2) return aX; // linear
    return CalcBezier(GetTForX(aX, mX1, mX2), mY1, mY2); // x to t, t to y
}

// norm distribution
float normpdf(float x) {
    float d = x - .5;
    return exp(-20.*d*d);
}

vec2 rotateUv(vec2 uv, float angle, vec2 anchor, float zDirection) {
    uv = uv - anchor; // anchor to origin
    float s = sin(angle);
	float c = cos(angle);
	mat2 m = mat2(c, -s, s, c);
    uv = m * uv;
    uv += anchor; // anchor back
    return uv;
}



vec4 transition (vec2 uv) {
    
    vec2 myst = uv;
    float animationTime = progress; //getAnimationTime();
    float easingTime = KeySpline(animationTime, .68,.01,.17,.98);
    float blur = normpdf(easingTime);
    float r = 0.;
    float rotation = 180./180.*3.14159;
    if (easingTime <= .5) {
        r = rotation * easingTime;
    } else {
        r = -rotation + rotation * easingTime;
    }

    // rotation for current frame
    vec2 mystCurrent = myst;
    mystCurrent.y *= 1./ratio;
    mystCurrent = rotateUv(mystCurrent, r, vec2(1., 0.), -1.);
    mystCurrent.y *= ratio;
    
    // frame timeInterval by fps=30
    float timeInterval = 0.0167*2.0;
    if (easingTime <= .5) {
        r = rotation * (easingTime+timeInterval);
    } else {
        r = -rotation + rotation * (easingTime+timeInterval);
    }
    
    // rotation for next frame
    vec2 mystNext = myst;
    mystNext.y *= 1./ratio;
    mystNext = rotateUv(mystNext, r, vec2(1., 0.), -1.);
    mystNext.y *= ratio;
    
    // get speed at tagent direction
    vec2 speed  = (mystNext - mystCurrent) / timeInterval * blur * 0.5;
    if (easingTime <= .5) {
        return motionBlurFrom(mystCurrent, speed);
    } else {
        return motionBlurTo(mystCurrent, speed);
    }
}

`,author:`chenkai`,license:`MIT`,description:`The outgoing image is flung away along a curve with motion blur`,tags:[`motion-blur`,`rotate`,`slide`],params:{},textures:[],createdAt:`Wed, 25 Mar 2020 10:46:29 +0800`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`undulatingBurnOut`,paramsTypes:{smoothness:`float`,center:`vec2`,color:`vec3`},defaultParams:{smoothness:.03,center:[.5,.5],color:[0,0,0]},glsl:`// License: MIT
// Author: pthrasher
// Description: A circle with a wavy edge burns out from the center to reveal the incoming image
// Tags: circle, burn, wipe
// adapted by gre from https://gist.github.com/pthrasher/8e6226b215548ba12734

// @param Softness of the edge
uniform float smoothness; // = 0.03
// @param Center of the circle
uniform vec2 center; // = vec2(0.5)
// @color Color of the burning edge
uniform vec3 color; // = vec3(0.0)

const float M_PI = 3.14159265358979323846;

float quadraticInOut(float t) {
  float p = 2.0 * t * t;
  return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
}

float getGradient(float r, float dist) {
  float d = r - dist;
  return mix(
    smoothstep(-smoothness, 0.0, r - dist * (1.0 + smoothness)),
    -1.0 - step(0.005, d),
    step(-0.005, d) * step(d, 0.01)
  );
}

float getWave(vec2 p){
  vec2 _p = p - center; // offset from center
  float rads = atan(_p.y, _p.x);
  float degs = degrees(rads) + 180.0;
  vec2 range = vec2(0.0, M_PI * 30.0);
  vec2 domain = vec2(0.0, 360.0);
  float ratio = (M_PI * 30.0) / 360.0;
  degs = degs * ratio;
  float x = progress;
  float magnitude = mix(0.02, 0.09, smoothstep(0.0, 1.0, x));
  float offset = mix(40.0, 30.0, smoothstep(0.0, 1.0, x));
  float ease_degs = quadraticInOut(sin(degs));
  float deg_wave_pos = (ease_degs * magnitude) * sin(x * offset);
  // The soft edge reaches \`smoothness\` beyond the radius and the burn band 0.005 inside it:
  // start the radius below both so nothing but the outgoing image shows at progress 0
  // (unchanged from progress 0.1 on).
  return x - max(smoothness, 0.01) * (1.0 - smoothstep(0.0, 0.1, x)) + deg_wave_pos;
}

vec4 transition(vec2 p) {
  float dist = distance(center, p);
  float m = getGradient(getWave(p), dist);
  vec4 cfrom = getFromColor(p);
  vec4 cto = getToColor(p);
  return mix(mix(cfrom, cto, m), mix(cfrom, vec4(color, 1.0), 0.75), step(m, -2.0));
}
`,author:`pthrasher`,license:`MIT`,description:`A circle with a wavy edge burns out from the center to reveal the incoming image`,tags:[`circle`,`burn`,`wipe`],params:{smoothness:{type:`float`,default:.03,description:`Softness of the edge`},center:{type:`vec2`,default:[.5,.5],description:`Center of the circle`},color:{type:`vec3`,default:[0,0,0],color:!0,description:`Color of the burning edge`}},textures:[],createdAt:`Mon, 12 Jun 2017 10:23:37 +0800`,updatedAt:`Sat, 10 Oct 2026 11:26:01 +0200`},{name:`wind`,paramsTypes:{size:`float`,reversed:`bool`},defaultParams:{size:.2,reversed:!1},glsl:`// Author: gre
// License: MIT
// Description: A ragged left-to-right wipe, as if the image was blown away by the wind
// Tags: wipe, horizontal, noise

// @range(0, 1) Width of the ragged edge
uniform float size; // = 0.2
// @param Wipe from right to left instead
uniform bool reversed; // = false

float rand (vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 transition (vec2 uv) {
  float x = reversed ? 1. - uv.x : uv.x;
  float r = rand(vec2(0, uv.y));
  float m = smoothstep(0.0, -size, x*(1.0-size) + size*r - (progress * (1.0 + size)));
  return mix(
    getFromColor(uv),
    getToColor(uv),
    m
  );
}
`,author:`gre`,license:`MIT`,description:`A ragged left-to-right wipe, as if the image was blown away by the wind`,tags:[`wipe`,`horizontal`,`noise`],params:{size:{type:`float`,default:.2,min:0,max:1,description:`Width of the ragged edge`},reversed:{type:`bool`,default:!1,description:`Wipe from right to left instead`}},textures:[],createdAt:`Fri, 26 May 2017 09:55:44 +0200`,updatedAt:`Fri, 9 Oct 2026 22:46:55 +0200`},{name:`windowblinds`,paramsTypes:{},defaultParams:{},glsl:`// Author: Fabien Benetou
// License: MIT
// Description: A crossfade through horizontal window blinds
// Tags: blinds, stripes, blend

vec4 transition (vec2 uv) {
  float t = progress;
  
  if (mod(floor(uv.y*100.*progress),2.)==0.)
    t*=2.-.5;
  
  return mix(
    getFromColor(uv),
    getToColor(uv),
    mix(t, progress, smoothstep(0.8, 1.0, progress))
  );
}
`,author:`Fabien Benetou`,license:`MIT`,description:`A crossfade through horizontal window blinds`,tags:[`blinds`,`stripes`,`blend`],params:{},textures:[],createdAt:`Wed, 31 May 2017 14:11:48 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`windowslice`,paramsTypes:{count:`float`,smoothness:`float`},defaultParams:{count:10,smoothness:.5},glsl:`// Author: gre
// License: MIT
// Description: The incoming image appears through vertical slices that widen
// Tags: slices, stripes, wipe

// @param Number of slices
uniform float count; // = 10.0
// @param Softness of the slices' edges
uniform float smoothness; // = 0.5

vec4 transition (vec2 p) {
  float pr = smoothstep(-smoothness, 0.0, p.x - progress * (1.0 + smoothness));
  float s = step(pr, fract(count * p.x));
  return mix(getFromColor(p), getToColor(p), s);
}
`,author:`gre`,license:`MIT`,description:`The incoming image appears through vertical slices that widen`,tags:[`slices`,`stripes`,`wipe`],params:{count:{type:`float`,default:10,description:`Number of slices`},smoothness:{type:`float`,default:.5,description:`Softness of the slices' edges`}},textures:[],createdAt:`Wed, 28 Mar 2018 17:23:26 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`wipeDown`,paramsTypes:{},defaultParams:{},glsl:`// Author: Jake Nelson
// License: MIT
// Description: A hard-edged wipe from top to bottom
// Tags: wipe, vertical

vec4 transition(vec2 uv) {
  vec2 p=uv.xy/vec2(1.0).xy;
  vec4 a=getFromColor(p);
  vec4 b=getToColor(p);
  return mix(a, b, step(1.0-p.y,progress));
}
`,author:`Jake Nelson`,license:`MIT`,description:`A hard-edged wipe from top to bottom`,tags:[`wipe`,`vertical`],params:{},textures:[],createdAt:`Wed, 1 Nov 2017 15:26:01 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`wipeLeft`,paramsTypes:{},defaultParams:{},glsl:`// Author: Jake Nelson
// License: MIT
// Description: A hard-edged wipe from right to left
// Tags: wipe, horizontal

vec4 transition(vec2 uv) {
  vec2 p=uv.xy/vec2(1.0).xy;
  vec4 a=getFromColor(p);
  vec4 b=getToColor(p);
  return mix(a, b, step(1.0-p.x,progress));
}
`,author:`Jake Nelson`,license:`MIT`,description:`A hard-edged wipe from right to left`,tags:[`wipe`,`horizontal`],params:{},textures:[],createdAt:`Wed, 1 Nov 2017 15:26:28 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`wipeRight`,paramsTypes:{},defaultParams:{},glsl:`// Author: Jake Nelson
// License: MIT
// Description: A hard-edged wipe from left to right
// Tags: wipe, horizontal

vec4 transition(vec2 uv) {
  vec2 p=uv.xy/vec2(1.0).xy;
  vec4 a=getFromColor(p);
  vec4 b=getToColor(p);
  return mix(a, b, step(0.0+p.x,progress));
}
`,author:`Jake Nelson`,license:`MIT`,description:`A hard-edged wipe from left to right`,tags:[`wipe`,`horizontal`],params:{},textures:[],createdAt:`Wed, 1 Nov 2017 15:27:02 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`wipeUp`,paramsTypes:{},defaultParams:{},glsl:`// Author: Jake Nelson
// License: MIT
// Description: A hard-edged wipe from bottom to top
// Tags: wipe, vertical

vec4 transition(vec2 uv) {
  vec2 p=uv.xy/vec2(1.0).xy;
  vec4 a=getFromColor(p);
  vec4 b=getToColor(p);
  return mix(a, b, step(0.0+p.y,progress));
}
`,author:`Jake Nelson`,license:`MIT`,description:`A hard-edged wipe from bottom to top`,tags:[`wipe`,`vertical`],params:{},textures:[],createdAt:`Wed, 1 Nov 2017 15:24:36 -0500`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`},{name:`x_axis_translation`,paramsTypes:{},defaultParams:{},glsl:`// Author: lizhongjian
// License: MIT
// Description: The outgoing image slides to the right, uncovering a crossfade to the incoming one
// Tags: slide, horizontal, blend

vec4 transition (vec2 uv) {
  vec2 newUV = uv;
  newUV.x -= progress;
  if(uv.x >= progress)
  {
    return getFromColor(newUV);
  }

  
  return mix(
    getFromColor(uv),
    getToColor(uv),
    progress
  );
}
`,author:`lizhongjian`,license:`MIT`,description:`The outgoing image slides to the right, uncovering a crossfade to the incoming one`,tags:[`slide`,`horizontal`,`blend`],params:{},textures:[],createdAt:`Tue, 4 Apr 2023 15:34:35 +0800`,updatedAt:`Sat, 10 Oct 2026 10:11:31 +0200`},{name:`zoomInOut`,paramsTypes:{},defaultParams:{},glsl:`// Author: OllyOllyOlly
// License: MIT
// Description: Zooms into the outgoing image until it blurs into a flat color, then out to the incoming one
// Tags: zoom, blur

vec2 zoom(vec2 uv, float amount) {
  return 0.5 + ((uv - 0.5) * (1.0 - amount));
}

vec4 transition (vec2 uv) {
  float zoomFrom = smoothstep(0.0, 1.0, progress * 2.0);
  float zoomTo = smoothstep(0.0, 1.0, (1.0 - progress) * 2.0);
  float crossfade = smoothstep(0.4, 0.6, progress);
  return mix(
    getFromColor(zoom(uv, zoomFrom)),
    getToColor(zoom(uv, zoomTo)),
    crossfade
  );
}
`,author:`OllyOllyOlly`,license:`MIT`,description:`Zooms into the outgoing image until it blurs into a flat color, then out to the incoming one`,tags:[`zoom`,`blur`],params:{},textures:[],createdAt:`Wed, 1 Apr 2026 19:33:08 +0200`,updatedAt:`Fri, 9 Oct 2026 23:10:29 +0200`}]}))(),1),ue=[`Dissolve`,`Wipe`,`Slide & Push`,`3D & Motion`,`Zoom`,`Stylize`,`Audio`],de=[{id:`cross-dissolve`,name:`Cross Dissolve`,group:`Dissolve`,glslId:`fade`},{id:`dip-to-black`,name:`Dip to Black`,group:`Dissolve`,glslId:`fadecolor`,overrides:{color:{default:`#000000`},colorPhase:{label:`Hold`}}},{id:`dip-to-white`,name:`Dip to White`,group:`Dissolve`,glslId:`fadecolor`,overrides:{color:{default:`#ffffff`},colorPhase:{label:`Hold`}}},{id:`dip-to-gray`,name:`Dip to Gray`,group:`Dissolve`,glslId:`fadegrayscale`},{id:`film-dissolve`,name:`Film Dissolve`,group:`Dissolve`,glslId:`dissolve`,overrides:{uLineWidth:{label:`Edge Width`},uSpreadClr:{label:`Edge Color`},uHotClr:{label:`Hot Color`},uPow:{label:`Falloff`},uIntensity:{label:`Intensity`}}},{id:`morph`,name:`Morph`,group:`Dissolve`,glslId:`morph`},{id:`dreamy`,name:`Dreamy`,group:`Dissolve`,glslId:`Dreamy`},{id:`cross-warp`,name:`Cross Warp`,group:`Dissolve`,glslId:`crosswarp`},{id:`static`,name:`Static`,group:`Dissolve`,glslId:`StaticFade`,overrides:{n_noise_pixels:{label:`Grain`,min:10,max:1e3},static_luminosity:{label:`Brightness`}}},{id:`blur-dissolve`,name:`Blur Dissolve`,group:`Dissolve`,glslId:`LinearBlur`},{id:`defocus`,name:`Defocus`,group:`Dissolve`,glslId:`DefocusBlur`,overrides:{blurSize:{max:.2}}},{id:`color-phase`,name:`Color Phase`,group:`Dissolve`,glslId:`colorphase`},{id:`perlin`,name:`Perlin`,group:`Dissolve`,glslId:`perlin`,overrides:{seed:{animatable:!1}}}],fe=[{id:`wipe-left`,name:`Wipe Left`,group:`Wipe`,glslId:`wipeLeft`},{id:`wipe-right`,name:`Wipe Right`,group:`Wipe`,glslId:`wipeRight`},{id:`wipe-up`,name:`Wipe Up`,group:`Wipe`,glslId:`wipeUp`},{id:`wipe-down`,name:`Wipe Down`,group:`Wipe`,glslId:`wipeDown`},{id:`directional-wipe`,name:`Directional Wipe`,group:`Wipe`,glslId:`directionalwipe`},{id:`clock-wipe`,name:`Clock Wipe`,group:`Wipe`,glslId:`angular`,overrides:{startingAngle:{label:`Start Angle`,min:0,max:360}}},{id:`circle-wipe`,name:`Circle Wipe`,group:`Wipe`,glslId:`circleopen`},{id:`circle`,name:`Circle`,group:`Wipe`,glslId:`circle`,overrides:{backColor:{label:`Background`}}},{id:`slices`,name:`Slices`,group:`Wipe`,glslId:`windowslice`,overrides:{count:{min:1,max:100}}},{id:`blinds`,name:`Blinds`,group:`Wipe`,glslId:`windowblinds`},{id:`checkerboard`,name:`Checkerboard`,group:`Wipe`,glslId:`chessboard`,overrides:{grid_num:{label:`Grid`,min:2,max:40}}},{id:`random-blocks`,name:`Random Blocks`,group:`Wipe`,glslId:`randomsquares`},{id:`radial-wipe`,name:`Radial Wipe`,group:`Wipe`,glslId:`Radial`},{id:`star-wipe`,name:`Star Wipe`,group:`Wipe`,glslId:`StarWipe`,overrides:{border_thickness:{label:`Border`,max:.1},star_rotation:{label:`Rotation`},border_color:{label:`Border Color`},star_center:{label:`Center`}}},{id:`heart`,name:`Heart`,group:`Wipe`,glslId:`heart`},{id:`hexagons`,name:`Hexagons`,group:`Wipe`,glslId:`hexagonalize`,overrides:{horizontalHexagons:{label:`Columns`,min:1,max:100}}},{id:`squares`,name:`Squares`,group:`Wipe`,glslId:`squareswire`},{id:`wind`,name:`Wind`,group:`Wipe`,glslId:`wind`}],pe=[{id:`push-left`,name:`Push Left`,group:`Slide & Push`,glslId:`Directional`,overrides:{direction:{default:[1,0]}}},{id:`push-right`,name:`Push Right`,group:`Slide & Push`,glslId:`Directional`,overrides:{direction:{default:[-1,0]}}},{id:`push-up`,name:`Push Up`,group:`Slide & Push`,glslId:`Directional`,overrides:{direction:{default:[0,-1]}}},{id:`push-down`,name:`Push Down`,group:`Slide & Push`,glslId:`Directional`,overrides:{direction:{default:[0,1]}}},{id:`split-horizontal`,name:`Split Horizontal`,group:`Slide & Push`,glslId:`LeftRight`},{id:`split-vertical`,name:`Split Vertical`,group:`Slide & Push`,glslId:`TopBottom`},{id:`slides`,name:`Slides`,group:`Slide & Push`,glslId:`Slides`,overrides:{type:{label:`Edge`,min:0,max:8},In:{label:`Slide In`}}},{id:`bounce`,name:`Bounce`,group:`Slide & Push`,glslId:`Bounce`,overrides:{shadow_colour:{label:`Shadow`},shadow_height:{label:`Shadow Height`}}},{id:`swap`,name:`Swap`,group:`Slide & Push`,glslId:`swap`},{id:`squeeze`,name:`Squeeze`,group:`Slide & Push`,glslId:`squeeze`,overrides:{colorSeparation:{label:`Color Separation`}}},{id:`doorway`,name:`Doorway`,group:`Slide & Push`,glslId:`doorway`}],me=[{id:`cube`,name:`Cube`,group:`3D & Motion`,glslId:`cube`,overrides:{persp:{label:`Perspective`}}},{id:`rotate-fade`,name:`Rotate & Fade`,group:`3D & Motion`,glslId:`rotate_scale_fade`,overrides:{backColor:{label:`Background`}}},{id:`roll`,name:`Roll`,group:`3D & Motion`,glslId:`Rolls`,overrides:{type:{label:`Corner`,min:0,max:3},RotDown:{label:`Roll Down`}}},{id:`flip`,name:`Flip`,group:`3D & Motion`,glslId:`SimpleFlip`},{id:`page-curl`,name:`Page Curl`,group:`3D & Motion`,glslId:`InvertedPageCurl`},{id:`grid-flip`,name:`Grid Flip`,group:`3D & Motion`,glslId:`GridFlip`,overrides:{dividerWidth:{label:`Divider`},bgcolor:{label:`Background`}}},{id:`book-flip`,name:`Book Flip`,group:`3D & Motion`,glslId:`BookFlip`},{id:`fold`,name:`Fold`,group:`3D & Motion`,glslId:`Fold`},{id:`swirl`,name:`Swirl`,group:`3D & Motion`,glslId:`Swirl`},{id:`pinwheel`,name:`Pinwheel`,group:`3D & Motion`,glslId:`pinwheel`},{id:`kaleidoscope`,name:`Kaleidoscope`,group:`3D & Motion`,glslId:`kaleidoscope`},{id:`water-drop`,name:`Water Drop`,group:`3D & Motion`,glslId:`WaterDrop`,overrides:{amplitude:{max:100},speed:{max:100}}},{id:`ripple`,name:`Ripple`,group:`3D & Motion`,glslId:`ripple`,overrides:{amplitude:{max:300},speed:{max:200}}}],he=[{id:`zoom-in`,name:`Zoom In`,group:`Zoom`,glslId:`SimpleZoom`,overrides:{zoom_quickness:{label:`Quickness`}}},{id:`cross-zoom`,name:`Cross Zoom`,group:`Zoom`,glslId:`CrossZoom`},{id:`zoom-circles`,name:`Zoom Circles`,group:`Zoom`,glslId:`ZoomInCircles`}],ge=[{id:`burn`,name:`Burn`,group:`Stylize`,glslId:`burn`},{id:`film-burn`,name:`Film Burn`,group:`Stylize`,glslId:`FilmBurn`,overrides:{Seed:{label:`Seed`,min:0,max:10,animatable:!1}}},{id:`glitch`,name:`Glitch`,group:`Stylize`,glslId:`GlitchMemories`},{id:`glitch-displace`,name:`Glitch Displace`,group:`Stylize`,glslId:`GlitchDisplace`},{id:`pixelate`,name:`Pixelate`,group:`Stylize`,glslId:`pixelize`,overrides:{squaresMin:{label:`Smallest Grid`}}},{id:`mosaic`,name:`Mosaic`,group:`Stylize`,glslId:`Mosaic`,overrides:{endx:{label:`End Column`,min:-5,max:5},endy:{label:`End Row`,min:-5,max:5}}},{id:`tv-static`,name:`TV Static`,group:`Stylize`,glslId:`TVStatic`},{id:`doom`,name:`Doom`,group:`Stylize`,glslId:`DoomScreenTransition`,overrides:{dripScale:{label:`Drip`}}},{id:`fly-eye`,name:`Fly Eye`,group:`Stylize`,glslId:`flyeye`,overrides:{colorSeparation:{label:`Color Separation`}}}],_e=new Map(le.default.map(e=>[e.name,e]));function ve(e){return _e.get(e)}function ye(e){return e.replace(/^u(?=[A-Z])/,``).replace(/([a-z0-9])([A-Z])/g,`$1 $2`).replace(/[_-]+/g,` `).replace(/\bclr\b/i,`color`).trim().replace(/\b\w/g,e=>e.toUpperCase())}var be=/col(?:ou)?r|clr/i;function xe(e){return`#`+e.slice(0,3).map(e=>Math.round(Math.min(1,Math.max(0,e))*255).toString(16).padStart(2,`0`)).join(``)}function Se(e,t){if(t)return{min:Math.min(0,e),max:Math.max(10,e*4),step:1};let n=Math.abs(e);return n<=1?{min:e<0?-1:0,max:1,step:.01}:n<=10?{min:0,max:20,step:.1}:{min:0,max:Math.ceil(n*4),step:1}}function Ce(e,t,n){let r=ye(e);switch(t){case`float`:case`int`:{let i=typeof n==`number`?n:0;return{key:e,label:r,kind:`number`,...Se(i,t===`int`),default:i,animatable:!0}}case`bool`:return{key:e,label:r,kind:`boolean`,default:!!n,animatable:!1};case`vec2`:case`ivec2`:{let i=Array.isArray(n)?n:[0,0];return{key:e,label:r,kind:`point`,unit:``,step:t===`ivec2`?1:.01,default:[i[0],i[1]],animatable:!0}}case`vec3`:return{key:e,label:r,kind:`color`,default:xe(Array.isArray(n)?n:[0,0,0]),animatable:!0};case`vec4`:return be.test(e)?{key:e,label:r,kind:`color`,default:xe(Array.isArray(n)?n:[0,0,0,1]),animatable:!0}:null;default:return null}}function we(e){let t=_e.get(e.glslId);if(!t)throw Error(`gl-transition ${e.glslId} not found`);let n=[];for(let[r,i]of Object.entries(t.paramsTypes)){let a=Ce(r,i,t.defaultParams[r]);a&&n.push({...a,...e.overrides?.[r]})}let r={};for(let e of n)r[e.key]=Array.isArray(e.default)?[e.default[0],e.default[1]]:e.default;return{id:e.id,name:e.name,group:e.group,kind:`video`,glslId:e.glslId,defaultParams:r,params:n,description:e.description}}var Te=[{id:`crossfade`,name:`Constant Power`,group:`Audio`,kind:`audio`,defaultParams:{},params:[],description:`Equal loudness through the middle`},{id:`constant-gain`,name:`Constant Gain`,group:`Audio`,kind:`audio`,defaultParams:{},params:[],description:`Straight lines, dips a little in the middle`},{id:`exponential-fade`,name:`Exponential Fade`,group:`Audio`,kind:`audio`,defaultParams:{},params:[],description:`Fades out fast, comes in late`}],Ee=[...[...de,...fe,...pe,...me,...he,...ge].map(we),...Te],De=new Map(Ee.map(e=>[e.id,e]));function Oe(e){return De.get(e)}function ke(e){return Ee.filter(t=>t.group===e)}function Ae(e){return De.get(e)?.kind===`audio`}function je(e,t){let n=Math.min(1,Math.max(0,t));switch(e){case`constant-gain`:return{outGain:1-n,inGain:n};case`exponential-fade`:return{outGain:(1-n)*(1-n),inGain:n*n};default:return{outGain:Math.cos(n*Math.PI/2),inGain:Math.sin(n*Math.PI/2)}}}function Me(e){return e<=0?0:e>=1?1:e}var{min:Ne,max:Pe,cbrt:Fe,sqrt:Ie,acos:Le,cos:Re}=Math,ze=(e,t,n,r)=>{let i=1/Pe(r,Ie(e)),a=e*i,o=a*i,s=r*i,c=n*o,l=s*s+c,u=-s*(s*s+1.5*c)-t*a*o,d=u*u-l*l*l,f;if(!l||d>1e-12*u*u){let e=-Fe(u<0?u-Ie(d):u+Ie(d));f=e+l/e||0}else{let e=Ie(l);f=2*e*Re(Le(Pe(-1,Ne(1,-u/(l*e))))/3)}return Ne(1,a/(f+s))},Be=(e,t,n,r)=>((t*e+n)*e+r)*e;function Ve(e,t,n,r){if(!(0<=e&&e<=1&&0<=n&&n<=1))throw Error(`bezier x values must be in [0, 1] range`);if(e===t&&n===r)return Me;let i=(3*e-3*n+1)/2,a=n-2*e,o=e,s=3*t-3*r+1,c=3*(r-2*t),l=3*t;return function(e){return e>0&&e<1?Be(ze(e,i,a,o),s,c,l):Me(e)}}var He=1e-4,Ue={"ease-in":Ve(.42,0,1,1),"ease-out":Ve(0,0,.58,1),"ease-in-out":Ve(.42,0,.58,1)};function We(e,t){return e===`linear`?t:e===`hold`?0:Ue[e](t)}function Ge(e){return Array.isArray(e)}function Ke(e,t,n){return typeof e==`number`&&typeof t==`number`?e+(t-e)*n:Ge(e)&&Ge(t)?[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n]:n<1?e:t}function qe(e,t,n){if(e.length===0)return n;if(t<=e[0].time)return e[0].value;let r=e[e.length-1];if(t>=r.time)return r.value;let i=0;for(;i<e.length-1&&e[i+1].time<=t;)i++;let a=e[i],o=e[i+1],s=o.time-a.time;if(s<=0)return o.value;let c=We(a.easing,(t-a.time)/s);return Ke(a.value,o.value,c)}function Je(e,t,n,r){let i=e.keyframes[t];if(i&&i.length>0)return qe(i,n);let a=e.params[t]??r;if(a===void 0)throw Error(`effect ${e.type} has no param ${t}`);return a}function O(e,t){let n={...e.params};for(let r of Object.keys(e.keyframes)){let i=qe(e.keyframes[r],t,e.params[r]);i!==void 0&&(n[r]=i)}return n}function Ye(e,t){return(e.keyframes[t]?.length??0)>0}function Xe(e,t,n,r=He){return e.keyframes[t]?.find(e=>Math.abs(e.time-n)<=r)??null}function Ze(e,t,n,r,i){let a=e.keyframes[t]??=[],o=a.find(e=>Math.abs(e.time-n)<=He);if(o)return o.value=r,i&&(o.easing=i),o;let s={time:n,value:r,easing:i??`linear`};return a.push(s),a.sort((e,t)=>e.time-t.time),s}function Qe(e,t,n){let r=e.keyframes[t];if(!r)return!1;let i=r.findIndex(e=>Math.abs(e.time-n)<=He);return i<0?!1:(r.splice(i,1),r.length===0&&delete e.keyframes[t],!0)}function $e(e,t,n){if(Ye(e,t))return e.params[t]=Je(e,t,n),delete e.keyframes[t],!1;let r=e.params[t];if(r===void 0)throw Error(`effect ${e.type} has no param ${t}`);return Ze(e,t,n,r),!0}function et(e,t,n,r){let i=e.keyframes[t];if(!i)return!1;let a=i.find(e=>Math.abs(e.time-n)<=He);if(!a)return!1;let o=i.find(e=>e!==a&&Math.abs(e.time-r)<=He);return o&&i.splice(i.indexOf(o),1),a.time=r,i.sort((e,t)=>e.time-t.time),!0}function tt(e,t,n,r){let i=Xe(e,t,n);return i?(i.easing=r,!0):!1}function nt(e,t,n){let r=(t-e.start)*e.speed,i=e.reverse?e.in+e.duration*e.speed-r:e.in+r;return n>0?Math.min(n,Math.max(0,i)):Math.max(0,i)}function rt(e){return{start:e.in,end:e.in+e.duration*e.speed}}function it(e,t){return e.reverse?e.start+(e.in+e.duration*e.speed-t)/e.speed:e.start+(t-e.in)/e.speed}function at(e){return e.start+e.duration}var ot=`
in vec2 vTextureCoord;
in vec4 vColor;

out vec4 finalColor;

uniform float uBlend;

uniform sampler2D uTexture;
uniform sampler2D uBackTexture;

{FUNCTIONS}

void main()
{ 
    vec4 back = texture(uBackTexture, vTextureCoord);
    vec4 front = texture(uTexture, vTextureCoord);
    float blendedAlpha = front.a + back.a * (1.0 - front.a);
    
    {MAIN}
}
`,st=`in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 backgroundUv;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,ct=`
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct BlendUniforms {
  uBlend:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;
@group(0) @binding(3) var uBackTexture: texture_2d<f32>;

@group(1) @binding(0) var<uniform> blendUniforms : BlendUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}

{FUNCTIONS}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {


   var back =  textureSample(uBackTexture, uSampler, uv);
   var front = textureSample(uTexture, uSampler, uv);
   var blendedAlpha = front.a + back.a * (1.0 - front.a);
   
   var out = vec4<f32>(0.0,0.0,0.0,0.0);

   {MAIN}

   return out;
}`,k=class extends b{constructor(e){let t=e.gpu,n=lt({source:ct,...t}),r=S.from({vertex:{source:n,entryPoint:`mainVertex`},fragment:{source:n,entryPoint:`mainFragment`}}),i=e.gl,a=lt({source:ot,...i}),o=_.from({vertex:st,fragment:a}),s=new v({uBlend:{value:1,type:`f32`}});super({gpuProgram:r,glProgram:o,blendRequired:!0,resources:{blendUniforms:s,uBackTexture:f.EMPTY}})}};function lt(e){let{source:t,functions:n,main:r}=e;return t.replace(`{FUNCTIONS}`,n).replace(`{MAIN}`,r)}var ut=`
	float getLuminosity(vec3 c) {
		return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
	}

	vec3 setLuminosity(vec3 c, float lum) {
		float modLum = lum - getLuminosity(c);
		vec3 color = c.rgb + vec3(modLum);

		// clip back into legal range
		modLum = getLuminosity(color);
		vec3 modLumVec = vec3(modLum);

		float cMin = min(color.r, min(color.g, color.b));
		float cMax = max(color.r, max(color.g, color.b));

		if(cMin < 0.0) {
			color = mix(modLumVec, color, modLum / (modLum - cMin));
		}

		if(cMax > 1.0) {
			color = mix(modLumVec, color, (1.0 - modLum) / (cMax - modLum));
		}

		return color;
	}

	float getSaturation(vec3 c) {
		return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
	}

	vec3 setSaturationMinMidMax(vec3 cSorted, float s) {
		vec3 colorSorted = cSorted;

		if(colorSorted.z > colorSorted.x) {
			colorSorted.y = (((colorSorted.y - colorSorted.x) * s) / (colorSorted.z - colorSorted.x));
			colorSorted.z = s;
		}
		else {
			colorSorted.y = 0.0;
			colorSorted.z = 0.0;
		}

		colorSorted.x = 0.0;

		return colorSorted;
	}

	vec3 setSaturation(vec3 c, float s) {
		vec3 color = c;

		if(color.r <= color.g && color.r <= color.b) {
			if(color.g <= color.b) {
				color = setSaturationMinMidMax(color.rgb, s).rgb;
			}
			else {
				color = setSaturationMinMidMax(color.rbg, s).rbg;
			}
		}
		else if(color.g <= color.r && color.g <= color.b) {
			if(color.r <= color.b) {
				color = setSaturationMinMidMax(color.grb, s).grb;
			}
			else {
				color = setSaturationMinMidMax(color.gbr, s).gbr;
			}
		}
		else {
			// Using bgr for both fixes part of hue
			if(color.r <= color.g) {
				color = setSaturationMinMidMax(color.brg, s).brg;
			}
			else {
				color = setSaturationMinMidMax(color.bgr, s).bgr;
			}
		}

		return color;
	}
    `,dt=`
	fn getLuminosity(c: vec3<f32>) -> f32
	{
		return 0.3*c.r + 0.59*c.g + 0.11*c.b;
	}

	fn setLuminosity(c: vec3<f32>, lum: f32) -> vec3<f32>
	{
		var modLum: f32 = lum - getLuminosity(c);
		var color: vec3<f32> = c.rgb + modLum;

		// clip back into legal range
		modLum = getLuminosity(color);
		let modLumVec = vec3<f32>(modLum);

		let cMin: f32 = min(color.r, min(color.g, color.b));
		let cMax: f32 = max(color.r, max(color.g, color.b));

		if(cMin < 0.0)
		{
			color = mix(modLumVec, color, modLum / (modLum - cMin));
		}

		if(cMax > 1.0)
		{
			color = mix(modLumVec, color, (1 - modLum) / (cMax - modLum));
		}

		return color;
	}

	fn getSaturation(c: vec3<f32>) -> f32
	{
		return max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
	}

	fn setSaturationMinMidMax(cSorted: vec3<f32>, s: f32) -> vec3<f32>
	{
		var colorSorted = cSorted;

		if(colorSorted.z > colorSorted.x)
		{
			colorSorted.y = (((colorSorted.y - colorSorted.x) * s) / (colorSorted.z - colorSorted.x));
			colorSorted.z = s;
		}
		else
		{
			colorSorted.y = 0;
			colorSorted.z = 0;
		}

		colorSorted.x = 0;

		return colorSorted;
	}

	fn setSaturation(c: vec3<f32>, s: f32) -> vec3<f32>
	{
		var color = c;

		if (color.r <= color.g && color.r <= color.b)
		{
			if (color.g <= color.b)
			{
				color = vec3<f32>(setSaturationMinMidMax(color.rgb, s)).rgb;
			}
			else
			{
				color = vec3<f32>(setSaturationMinMidMax(color.rbg, s)).rbg;
			}
		}
		else if (color.g <= color.r && color.g <= color.b)
		{
			if (color.r <= color.b)
			{
				color = vec3<f32>(setSaturationMinMidMax(color.grb, s)).grb;
			}
			else
			{
				color = vec3<f32>(setSaturationMinMidMax(color.gbr, s)).gbr;
			}
		}
		else
		{
			// Using bgr for both fixes part of hue
			if (color.r <= color.g)
			{
				color = vec3<f32>(setSaturationMinMidMax(color.brg, s)).brg;
			}
			else
			{
				color  = vec3<f32>(setSaturationMinMidMax(color.bgr, s)).bgr;
			}
		}

		return color;
	}
	`,ft=class extends k{constructor(){super({gl:{functions:`
                ${ut}

                vec3 blendColor(vec3 base, vec3 blend,  float opacity)
                {
                    return (setLuminosity(blend, getLuminosity(base)) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendColor(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                ${dt}

                fn blendColorOpacity(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (setLuminosity(blend, getLuminosity(base)) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendColorOpacity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};ft.extension={name:`color`,type:x.BlendMode};var pt=class extends k{constructor(){super({gl:{functions:`
                float colorBurn(float base, float blend)
                {
                    return max((1.0 - ((1.0 - base) / blend)), 0.0);
                }

                vec3 blendColorBurn(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        colorBurn(base.r, blend.r),
                        colorBurn(base.g, blend.g),
                        colorBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendColorBurn(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn colorBurn(base:f32, blend:f32) -> f32
                {
                    return max((1.0-((1.0-base)/blend)),0.0);
                }

                fn blendColorBurn(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        colorBurn(base.r, blend.r),
                        colorBurn(base.g, blend.g),
                        colorBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendColorBurn(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};pt.extension={name:`color-burn`,type:x.BlendMode};var mt=class extends k{constructor(){super({gl:{functions:`
                float colorDodge(float base, float blend)
                {
                    return base / (1.0 - blend);
                }

                vec3 blendColorDodge(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        colorDodge(base.r, blend.r),
                        colorDodge(base.g, blend.g),
                        colorDodge(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendColorDodge(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn colorDodge(base: f32, blend: f32) -> f32
                {
                    return base / (1.0 - blend);
                }

                fn blendColorDodge(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        colorDodge(base.r, blend.r),
                        colorDodge(base.g, blend.g),
                        colorDodge(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                    out = vec4<f32>(blendColorDodge(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};mt.extension={name:`color-dodge`,type:x.BlendMode};var ht=class extends k{constructor(){super({gl:{functions:`
                vec3 blendDarken(vec3 base, vec3 blend, float opacity)
                {
                    return (min(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendDarken(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn blendDarken(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (min(blend,base) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendDarken(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};ht.extension={name:`darken`,type:x.BlendMode};var gt=class extends k{constructor(){super({gl:{functions:`
                vec3 blendDifference(vec3 base, vec3 blend,  float opacity)
                {
                    return (abs(blend - base) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendDifference(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn blendDifference(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (abs(blend - base) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendDifference(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};gt.extension={name:`difference`,type:x.BlendMode};var _t=class extends k{constructor(){super({gl:{functions:`
                float divide(float base, float blend)
                {
                    return (blend > 0.0) ? clamp(base / blend, 0.0, 1.0) : 1.0;
                }

                vec3 blendDivide(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        divide(base.r, blend.r),
                        divide(base.g, blend.g),
                        divide(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendDivide(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn divide(base: f32, blend: f32) -> f32
                {
                    return select(1.0, clamp(base / blend, 0.0, 1.0), blend > 0.0);
                }

                fn blendDivide(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        divide(base.r, blend.r),
                        divide(base.g, blend.g),
                        divide(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendDivide(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};_t.extension={name:`divide`,type:x.BlendMode};var vt=class extends k{constructor(){super({gl:{functions:`
                vec3 exclusion(vec3 base, vec3 blend)
                {
                    return base + blend - 2.0 * base * blend;
                }

                vec3 blendExclusion(vec3 base, vec3 blend, float opacity)
                {
                    return (exclusion(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendExclusion(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn exclusion(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32>
                {
                    return base+blend-2.0*base*blend;
                }

                fn blendExclusion(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    return (exclusion(base, blend) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendExclusion(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};vt.extension={name:`exclusion`,type:x.BlendMode};var yt=class extends k{constructor(){super({gl:{functions:`
                float hardLight(float base, float blend)
                {
                    return (blend < 0.5) ? 2.0 * base * blend : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
                }

                vec3 blendHardLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        hardLight(base.r, blend.r),
                        hardLight(base.g, blend.g),
                        hardLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendHardLight(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn hardLight(base: f32, blend: f32) -> f32
                {
                    return select(1.0 - 2.0 * (1.0 - base) * (1.0 - blend), 2.0 * base * blend, blend < 0.5);
                }

                fn blendHardLight(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        hardLight(base.r, blend.r),
                        hardLight(base.g, blend.g),
                        hardLight(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendHardLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};yt.extension={name:`hard-light`,type:x.BlendMode};var bt=class extends k{constructor(){super({gl:{functions:`
                float hardMix(float base, float blend)
                {
                    return (base + blend >= 1.0) ? 1.0 : 0.0;
                }

                vec3 blendHardMix(vec3 base, vec3 blend,  float opacity)
                {
                    vec3 blended = vec3(
                        hardMix(base.r, blend.r),
                        hardMix(base.g, blend.g),
                        hardMix(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendHardMix(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn hardMix(base: f32, blend: f32) -> f32
                {
                    return select(0.0, 1.0, base + blend >= 1.0);
                }

                fn blendHardMix(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended: vec3<f32> = vec3<f32>(
                        hardMix(base.r, blend.r),
                        hardMix(base.g, blend.g),
                        hardMix(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendHardMix(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};bt.extension={name:`hard-mix`,type:x.BlendMode};var xt=class extends k{constructor(){super({gl:{functions:`
                vec3 blendLighten(vec3 base, vec3 blend, float opacity)
                {
                    return (max(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLighten(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn blendLighten(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    return (max(base, blend) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLighten(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};xt.extension={name:`lighten`,type:x.BlendMode};var St=class extends k{constructor(){super({gl:{functions:`
                float linearBurn(float base, float blend)
                {
                    return max(0.0, base + blend - 1.0);
                }

                vec3 blendLinearBurn(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        linearBurn(base.r, blend.r),
                        linearBurn(base.g, blend.g),
                        linearBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLinearBurn(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn linearBurn(base: f32, blend: f32) -> f32
                {
                    return max(0.0, base + blend - 1.0);
                }

                fn blendLinearBurn(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        linearBurn(base.r, blend.r),
                        linearBurn(base.g, blend.g),
                        linearBurn(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendLinearBurn(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};St.extension={name:`linear-burn`,type:x.BlendMode};var Ct=class extends k{constructor(){super({gl:{functions:`
                float linearDodge(float base, float blend) {
                    return min(1.0, base + blend);
                }

                vec3 blendLinearDodge(vec3 base, vec3 blend, float opacity) {
                    vec3 blended = vec3(
                        linearDodge(base.r, blend.r),
                        linearDodge(base.g, blend.g),
                        linearDodge(base.b, blend.b)
                    );
                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLinearDodge(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn linearDodge(base: f32, blend: f32) -> f32
                {
                    return min(1, base + blend);
                }

                fn blendLinearDodge(base:vec3<f32>, blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        linearDodge(base.r, blend.r),
                        linearDodge(base.g, blend.g),
                        linearDodge(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLinearDodge(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Ct.extension={name:`linear-dodge`,type:x.BlendMode};var wt=class extends k{constructor(){super({gl:{functions:`
                float linearBurn(float base, float blend) {
                    return max(0.0, base + blend - 1.0);
                }

                float linearDodge(float base, float blend) {
                    return min(1.0, base + blend);
                }

                float linearLight(float base, float blend) {
                    return (blend <= 0.5) ? linearBurn(base,2.0*blend) : linearBurn(base,2.0*(blend-0.5));
                }

                vec3 blendLinearLight(vec3 base, vec3 blend, float opacity) {
                    vec3 blended = vec3(
                        linearLight(base.r, blend.r),
                        linearLight(base.g, blend.g),
                        linearLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendLinearLight(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn linearBurn(base: f32, blend: f32) -> f32
                {
                    return max(0.0, base + blend - 1.0);
                }

                fn linearDodge(base: f32, blend: f32) -> f32
                {
                    return min(1.0, base + blend);
                }

                fn linearLight(base: f32, blend: f32) -> f32
                {
                    return select(linearBurn(base,2.0*(blend-0.5)), linearBurn(base,2.0*blend), blend <= 0.5);
                }

                fn blendLinearLightOpacity(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        linearLight(base.r, blend.r),
                        linearLight(base.g, blend.g),
                        linearLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLinearLightOpacity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};wt.extension={name:`linear-light`,type:x.BlendMode};var Tt=class extends k{constructor(){super({gl:{functions:`
                ${ut}

                vec3 blendLuminosity(vec3 base, vec3 blend,  float opacity)
                {
                    vec3 blendLuminosity = setLuminosity(base, getLuminosity(blend));
                    return (blendLuminosity * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendLuminosity(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                ${dt}

                fn blendLuminosity(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blendLuminosity: vec3<f32> = setLuminosity(base, getLuminosity(blend));
                    return (blendLuminosity * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendLuminosity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Tt.extension={name:`luminosity`,type:x.BlendMode};var Et=class extends k{constructor(){super({gl:{functions:`
                vec3 negation(vec3 base, vec3 blend)
                {
                    return 1.0-abs(1.0-base-blend);
                }

                vec3 blendNegation(vec3 base, vec3 blend, float opacity)
                {
                    return (negation(base, blend) * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendNegation(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn blendNegation(base: vec3<f32>, blend: vec3<f32>) -> vec3<f32>
                {
                    return 1.0-abs(1.0-base-blend);
                }

                fn blendNegationOpacity(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    return (blendNegation(base, blend) * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendNegationOpacity(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};Et.extension={name:`negation`,type:x.BlendMode};var Dt=class extends k{constructor(){super({gl:{functions:`
                float overlay(float base, float blend)
                {
                    return (base < 0.5) ? (2.0*base*blend) : (1.0-2.0*(1.0-base)*(1.0-blend));
                }

                vec3 blendOverlay(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        overlay(base.r, blend.r),
                        overlay(base.g, blend.g),
                        overlay(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendOverlay(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn overlay(base: f32, blend: f32) -> f32
                {
                    return select((1.0-2.0*(1.0-base)*(1.0-blend)), (2.0*base*blend), base < 0.5);
                }

                fn blendOverlay(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        overlay(base.r, blend.r),
                        overlay(base.g, blend.g),
                        overlay(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendOverlay(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Dt.extension={name:`overlay`,type:x.BlendMode};var Ot=class extends k{constructor(){super({gl:{functions:`
                float pinLight(float base, float blend)
                {
                    return (blend <= 0.5) ? min(base, 2.0 * blend) : max(base, 2.0 * (blend - 0.5));
                }

                vec3 blendPinLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        pinLight(base.r, blend.r),
                        pinLight(base.g, blend.g),
                        pinLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendPinLight(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn pinLight(base: f32, blend: f32) -> f32
                {
                    return select(max(base,2.0*(blend-0.5)), min(base,2.0*blend), blend <= 0.5);
                }

                fn blendPinLight(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        pinLight(base.r, blend.r),
                        pinLight(base.g, blend.g),
                        pinLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendPinLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Ot.extension={name:`pin-light`,type:x.BlendMode};var kt=class extends k{constructor(){super({gl:{functions:`
                ${ut}

                vec3 blendSaturation(vec3 base, vec3 blend,  float opacity)
                {
                    vec3 blendSaturation = setLuminosity(setSaturation(base, getSaturation(blend)), getLuminosity(base));
                    return (blendSaturation * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendSaturation(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                ${dt}

                fn blendSaturation(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blendSaturation = setLuminosity(setSaturation(base, getSaturation(blend)), getLuminosity(base));
                    return (blendSaturation * opacity + base * (1.0 - opacity));
                }
            `,main:`
                out = vec4<f32>(blendSaturation(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
            `}})}};kt.extension={name:`saturation`,type:x.BlendMode};var At=class extends k{constructor(){super({gl:{functions:`
                float softLight(float base, float blend)
                {
                    return (blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
                }

                vec3 blendSoftLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        softLight(base.r, blend.r),
                        softLight(base.g, blend.g),
                        softLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendSoftLight(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn softLight(base: f32, blend: f32) -> f32
                {
                    return select(2.0 * base * blend + base * base * (1.0 - 2.0 * blend), sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend), blend < 0.5);
                }

                fn blendSoftLight(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended: vec3<f32> = vec3<f32>(
                        softLight(base.r, blend.r),
                        softLight(base.g, blend.g),
                        softLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendSoftLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};At.extension={name:`soft-light`,type:x.BlendMode};var jt=class extends k{constructor(){super({gl:{functions:`
                float subtract(float base, float blend)
                {
                    return max(0.0, base - blend);
                }

                vec3 blendSubtract(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        subtract(base.r, blend.r),
                        subtract(base.g, blend.g),
                        subtract(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                finalColor = vec4(blendSubtract(back.rgb, front.rgb, front.a), blendedAlpha) * uBlend;
                `},gpu:{functions:`
                fn subtract(base: f32, blend: f32) -> f32
                {
                    return max(0, base - blend);
                }

                fn blendSubtract(base:vec3<f32>,  blend:vec3<f32>,  opacity:f32) -> vec3<f32>
                {
                    let blended = vec3<f32>(
                        subtract(base.r, blend.r),
                        subtract(base.g, blend.g),
                        subtract(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendSubtract(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};jt.extension={name:`subtract`,type:x.BlendMode};var Mt=class extends k{constructor(){super({gl:{functions:`
                float colorBurn(float base, float blend)
                {
                    return max((1.0-((1.0-base)/blend)),0.0);
                }

                float colorDodge(float base, float blend)
                {
                    return min(1.0, base / (1.0-blend));
                }

                float vividLight(float base, float blend)
                {
                    return (blend < 0.5) ? colorBurn(base,(2.0*blend)) : colorDodge(base,(2.0*(blend-0.5)));
                }

                vec3 blendVividLight(vec3 base, vec3 blend, float opacity)
                {
                    vec3 blended = vec3(
                        vividLight(base.r, blend.r),
                        vividLight(base.g, blend.g),
                        vividLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
            `,main:`
                finalColor = vec4(blendVividLight(back.rgb, front.rgb,front.a), blendedAlpha) * uBlend;
            `},gpu:{functions:`
                fn colorBurn(base:f32, blend:f32) -> f32
                {
                    return max((1.0-((1.0-base)/blend)),0.0);
                }

                fn colorDodge(base: f32, blend: f32) -> f32
                {
                    return min(1.0, base / (1.0-blend));
                }

                fn vividLight(base: f32, blend: f32) -> f32
                {
                    return select(colorDodge(base,(2.0*(blend-0.5))), colorBurn(base,(2.0*blend)), blend<0.5);
                }

                fn blendVividLight(base: vec3<f32>, blend: vec3<f32>, opacity: f32) -> vec3<f32>
                {
                    let blended: vec3<f32> = vec3<f32>(
                        vividLight(base.r, blend.r),
                        vividLight(base.g, blend.g),
                        vividLight(base.b, blend.b)
                    );

                    return (blended * opacity + base * (1.0 - opacity));
                }
                `,main:`
                out = vec4<f32>(blendVividLight(back.rgb, front.rgb, front.a), blendedAlpha) * blendUniforms.uBlend;
                `}})}};Mt.extension={name:`vivid-light`,type:x.BlendMode},ne.add(ft,pt,mt,ht,gt,_t,vt,yt,bt,xt,St,wt,Ct,Tt,Et,Dt,Ot,kt,At,jt,Mt);var Nt;function Pt(e){return Nt===void 0&&(Nt=(()=>{let t={stencil:!0,failIfMajorPerformanceCaveat:e??ae.defaultOptions.failIfMajorPerformanceCaveat};try{if(!te.get().getWebGLRenderingContext())return!1;let e=te.get().createCanvas().getContext(`webgl`,t),n=!!e?.getContextAttributes()?.stencil;if(e){let t=e.getExtension(`WEBGL_lose_context`);t&&t.loseContext()}return e=null,n}catch{return!1}})()),Nt}var Ft;async function It(e={}){return Ft===void 0&&(Ft=await(async()=>{let t=te.get().getNavigator().gpu;if(!t)return!1;try{return await(await t.requestAdapter(e)).requestDevice(),!0}catch{return!1}})()),Ft}var Lt=[`webgl`,`webgpu`,`canvas`];async function Rt(e){let t=[];e.preference?Array.isArray(e.preference)?t=e.preference.slice():(t.push(e.preference),Lt.forEach(n=>{n!==e.preference&&t.push(n)})):t=Lt.slice();let r,i={};for(let a=0;a<t.length;a++){let o=t[a];if(o===`webgpu`&&await It()){let{WebGPURenderer:t}=await n(async()=>{let{WebGPURenderer:e}=await import(`./BTClWy23.js`).then(e=>e.t);return{WebGPURenderer:e}},__vite__mapDeps([0,1,2,3,4,5]),import.meta.url);r=t,i={...e,...e.webgpu};break}if(o===`webgl`&&Pt(e.failIfMajorPerformanceCaveat??ae.defaultOptions.failIfMajorPerformanceCaveat)){let{WebGLRenderer:t}=await n(async()=>{let{WebGLRenderer:e}=await import(`./CG5x0chc.js`).then(e=>e.t);return{WebGLRenderer:e}},__vite__mapDeps([6,1,2,4,5]),import.meta.url);r=t,i={...e,...e.webgl};break}if(o===`canvas`){let{CanvasRenderer:t}=await n(async()=>{let{CanvasRenderer:e}=await import(`./BE-PioMN.js`).then(e=>e.t);return{CanvasRenderer:e}},__vite__mapDeps([7,1,2,4,8,3]),import.meta.url);r=t,i={...e,...e.canvasOptions};break}}if(delete i.webgpu,delete i.webgl,delete i.canvasOptions,!r)throw Error(`No available renderer for the current environment`);let a=new r;return await a.init(i),a}var zt={5:[.153388,.221461,.250301],7:[.071303,.131514,.189879,.214607],9:[.028532,.067234,.124009,.179044,.20236],11:[.0093,.028002,.065984,.121703,.175713,.198596],13:[.002406,.009255,.027867,.065666,.121117,.174868,.197641],15:[489e-6,.002403,.009246,.02784,.065602,.120999,.174697,.197448]},Bt=`in vec2 vBlurTexCoords[%size%];
uniform sampler2D uTexture;
uniform vec4 uInputClamp;
out vec4 finalColor;
void main(void)
{
    %blur%
}`;function Vt(e){let t=zt[e],n=t.length,r=``;for(let i=0;i<e;i++){let a=i===0?`finalColor = `:`    + `,o=i<n?i:e-i-1,s=`texture(uTexture, clamp(vBlurTexCoords[%index%], uInputClamp.xy, uInputClamp.zw)) * %value%`.replace(`%index%`,i.toString()).replace(`%value%`,t[o].toString());r+=`${a}${s}
`}return Bt.replace(`%blur%`,`${r};`).replace(`%size%`,e.toString())}var Ht=`
    in vec2 aPosition;

    uniform float uStrength;

    out vec2 vBlurTexCoords[%size%];

    uniform vec4 uInputSize;
    uniform vec4 uOutputFrame;
    uniform vec4 uOutputTexture;

    vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

    vec2 filterTextureCoord( void )
    {
        return aPosition * (uOutputFrame.zw * uInputSize.zw);
    }

    void main(void)
    {
        gl_Position = filterVertexPosition();

        float pixelStrength = uInputSize.%dimension% * uStrength;

        vec2 textureCoord = filterTextureCoord();
        %blur%
    }`;function Ut(e,t){let n=Math.ceil(e/2),r=Ht,i=``,a;a=t?`vBlurTexCoords[%index%] =  textureCoord + vec2(%sampleIndex% * pixelStrength, 0.0);`:`vBlurTexCoords[%index%] =  textureCoord + vec2(0.0, %sampleIndex% * pixelStrength);`;for(let t=0;t<e;t++){let e=a.replace(`%index%`,t.toString());e=e.replace(`%sampleIndex%`,`${t-(n-1)}.0`),i+=e,i+=`
`}return r=r.replace(`%blur%`,i),r=r.replace(`%size%`,e.toString()),r=r.replace(`%dimension%`,t?`z`:`w`),r}function Wt(e,t){let n=Ut(t,e),r=Vt(t);return _.from({vertex:n,fragment:r,name:`blur-${e?`horizontal`:`vertical`}-pass-filter`})}var Gt=`

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct BlurUniforms {
  uStrength:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> blurUniforms : BlurUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    %blur-struct%
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}


@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>,
) -> VSOutput {

  let filteredCord = filterTextureCoord(aPosition);

  let pixelStrength = gfu.uInputSize.%dimension% * blurUniforms.uStrength;

  return VSOutput(
   filterVertexPosition(aPosition),
    %blur-vertex-out%
  );
}

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  %blur-fragment-in%
) -> @location(0) vec4<f32> {

    var   finalColor = vec4(0.0);

    %blur-sampling%

    return finalColor;
}
`;function Kt(e,t){let n=zt[t],r=n.length,i=[],a=[],o=[];for(let s=0;s<t;s++){i[s]=`@location(${s}) offset${s}: vec2<f32>,`,e?a[s]=`filteredCord + vec2(${s-r+1} * pixelStrength, 0.0),`:a[s]=`filteredCord + vec2(0.0, ${s-r+1} * pixelStrength),`;let c=n[s<r?s:t-s-1].toString();o[s]=`finalColor += textureSample(uTexture, uSampler,
            clamp(offset${s}, gfu.uInputClamp.xy, gfu.uInputClamp.zw)) * ${c};`}let s=i.join(`
`),c=a.join(`
`),l=o.join(`
`),u=Gt.replace(`%blur-struct%`,s).replace(`%blur-vertex-out%`,c).replace(`%blur-fragment-in%`,s).replace(`%blur-sampling%`,l).replace(`%dimension%`,e?`z`:`w`);return S.from({vertex:{source:u,entryPoint:`mainVertex`},fragment:{source:u,entryPoint:`mainFragment`}})}var qt=class e extends b{constructor(t){t={...e.defaultOptions,...t};let n=Wt(t.horizontal,t.kernelSize),r=Kt(t.horizontal,t.kernelSize);super({glProgram:n,gpuProgram:r,resources:{blurUniforms:{uStrength:{value:0,type:`f32`}}},...t}),this.horizontal=t.horizontal,this.legacy=t.legacy??!1,this._quality=0,this.quality=t.quality,this.blur=t.strength,this._blurUniforms=this.resources.blurUniforms,this._uniforms=this._blurUniforms.uniforms}apply(e,t,n,r){this.legacy?this._applyLegacy(e,t,n,r):this._applyOptimized(e,t,n,r)}_applyLegacy(e,t,n,r){if(this._uniforms.uStrength=this.strength/this.passes,this.passes===1)e.applyFilter(this,t,n,r);else{let i=y.getSameSizeTexture(t),a=t,o=i;this._state.blend=!1;let s=e.renderer.type===m.WEBGPU;for(let t=0;t<this.passes-1;t++){e.applyFilter(this,a,o,t===0||s);let n=o;o=a,a=n}this._state.blend=!0,e.applyFilter(this,a,n,r),y.returnTexture(i)}}_applyOptimized(e,t,n,r){if(this._uniforms.uStrength=this._calculateInitialStrength(),this.passes===1)e.applyFilter(this,t,n,r);else{let i=y.getSameSizeTexture(t),a=t,o=i;this._state.blend=!1;let s=e.renderer,c=s.type===m.WEBGPU,l=c?s.renderPipes.uniformBatch:null;for(let t=0;t<this.passes-1;t++){l&&this.groups[1].setResource(l.getUboResource(this._blurUniforms),0),e.applyFilter(this,a,o,c);let t=o;o=a,a=t,this._uniforms.uStrength*=.5}l&&this.groups[1].setResource(l.getUboResource(this._blurUniforms),0),this._state.blend=!0,e.applyFilter(this,a,n,r),y.returnTexture(i)}}_calculateInitialStrength(){let e=1,t=.5;for(let n=1;n<this.passes;n++)e+=t*t,t*=.5;return this.strength/Math.sqrt(e)}get blur(){return this.strength}set blur(e){this.padding=1+Math.abs(e)*2,this.strength=e}get quality(){return this._quality}set quality(e){this._quality=e,this.passes=e}};qt.defaultOptions={strength:8,quality:4,kernelSize:5,legacy:!1};var Jt=qt,Yt=class extends b{constructor(...e){let t=e[0]??{};typeof t==`number`&&(u(d,`BlurFilter constructor params are now options object. See params: { strength, quality, resolution, kernelSize }`),t={strength:t},e[1]!==void 0&&(t.quality=e[1]),e[2]!==void 0&&(t.resolution=e[2]||`inherit`),e[3]!==void 0&&(t.kernelSize=e[3])),t={...Jt.defaultOptions,...t};let{strength:n,strengthX:r,strengthY:i,quality:a,...o}=t;super({...o,compatibleRenderers:m.BOTH,resources:{}}),this._repeatEdgePixels=!1,this.blurXFilter=new Jt({horizontal:!0,...t}),this.blurYFilter=new Jt({horizontal:!1,...t}),this.quality=a,this.strengthX=r??n,this.strengthY=i??n,this.repeatEdgePixels=!1}apply(e,t,n,r){let i=Math.abs(this.blurXFilter.strength),a=Math.abs(this.blurYFilter.strength);if(i&&a){let i=y.getSameSizeTexture(t);this.blurXFilter.blendMode=`normal`,this.blurXFilter.apply(e,t,i,!0),this.blurYFilter.blendMode=this.blendMode,this.blurYFilter.apply(e,i,n,r),y.returnTexture(i)}else a?(this.blurYFilter.blendMode=this.blendMode,this.blurYFilter.apply(e,t,n,r)):(this.blurXFilter.blendMode=this.blendMode,this.blurXFilter.apply(e,t,n,r))}updatePadding(){this.padding=this._repeatEdgePixels?0:Math.max(Math.abs(this.blurXFilter.blur),Math.abs(this.blurYFilter.blur))*2}get strength(){if(this.strengthX!==this.strengthY)throw Error(`BlurFilter's strengthX and strengthY are different`);return this.strengthX}set strength(e){this.blurXFilter.blur=this.blurYFilter.blur=e,this.updatePadding()}get quality(){return this.blurXFilter.quality}set quality(e){this.blurXFilter.quality=this.blurYFilter.quality=e}get strengthX(){return this.blurXFilter.blur}set strengthX(e){this.blurXFilter.blur=e,this.updatePadding()}get strengthY(){return this.blurYFilter.blur}set strengthY(e){this.blurYFilter.blur=e,this.updatePadding()}get blur(){return u(`8.3.0`,`BlurFilter.blur is deprecated, please use BlurFilter.strength instead.`),this.strength}set blur(e){u(`8.3.0`,`BlurFilter.blur is deprecated, please use BlurFilter.strength instead.`),this.strength=e}get blurX(){return u(`8.3.0`,`BlurFilter.blurX is deprecated, please use BlurFilter.strengthX instead.`),this.strengthX}set blurX(e){u(`8.3.0`,`BlurFilter.blurX is deprecated, please use BlurFilter.strengthX instead.`),this.strengthX=e}get blurY(){return u(`8.3.0`,`BlurFilter.blurY is deprecated, please use BlurFilter.strengthY instead.`),this.strengthY}set blurY(e){u(`8.3.0`,`BlurFilter.blurY is deprecated, please use BlurFilter.strengthY instead.`),this.strengthY=e}get repeatEdgePixels(){return this._repeatEdgePixels}set repeatEdgePixels(e){this._repeatEdgePixels=e,this.updatePadding()}};Yt.defaultOptions={strength:8,quality:4,kernelSize:5,legacy:!1};var Xt=`
in vec2 vTextureCoord;
in vec4 vColor;

out vec4 finalColor;

uniform float uColorMatrix[20];
uniform float uAlpha;

uniform sampler2D uTexture;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    float randomValue = rand(gl_FragCoord.xy * 0.2);
    float diff = (randomValue - 0.5) *  0.5;

    if (uAlpha == 0.0) {
        finalColor = color;
        return;
    }

    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    vec4 result;

    result.r = (uColorMatrix[0] * color.r);
        result.r += (uColorMatrix[1] * color.g);
        result.r += (uColorMatrix[2] * color.b);
        result.r += (uColorMatrix[3] * color.a);
        result.r += uColorMatrix[4];

    result.g = (uColorMatrix[5] * color.r);
        result.g += (uColorMatrix[6] * color.g);
        result.g += (uColorMatrix[7] * color.b);
        result.g += (uColorMatrix[8] * color.a);
        result.g += uColorMatrix[9];

    result.b = (uColorMatrix[10] * color.r);
       result.b += (uColorMatrix[11] * color.g);
       result.b += (uColorMatrix[12] * color.b);
       result.b += (uColorMatrix[13] * color.a);
       result.b += uColorMatrix[14];

    result.a = (uColorMatrix[15] * color.r);
       result.a += (uColorMatrix[16] * color.g);
       result.a += (uColorMatrix[17] * color.b);
       result.a += (uColorMatrix[18] * color.a);
       result.a += uColorMatrix[19];

    vec3 rgb = mix(color.rgb, result.rgb, uAlpha);

    // Premultiply alpha again.
    rgb *= result.a;

    finalColor = vec4(rgb, result.a);
}
`,Zt=`struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct ColorMatrixUniforms {
  uColorMatrix:array<vec4<f32>, 5>,
  uAlpha:f32,
};


@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;
@group(1) @binding(0) var<uniform> colorMatrixUniforms : ColorMatrixUniforms;


struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>,
  };
  
fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition),
  );
}


@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {


  var c = textureSample(uTexture, uSampler, uv);
  
  if (colorMatrixUniforms.uAlpha == 0.0) {
    return c;
  }

 
    // Un-premultiply alpha before applying the color matrix. See issue #3539.
    if (c.a > 0.0) {
      c.r /= c.a;
      c.g /= c.a;
      c.b /= c.a;
    }

    var cm = colorMatrixUniforms.uColorMatrix;


    var result = vec4<f32>(0.);

    result.r = (cm[0][0] * c.r);
    result.r += (cm[0][1] * c.g);
    result.r += (cm[0][2] * c.b);
    result.r += (cm[0][3] * c.a);
    result.r += cm[1][0];

    result.g = (cm[1][1] * c.r);
    result.g += (cm[1][2] * c.g);
    result.g += (cm[1][3] * c.b);
    result.g += (cm[2][0] * c.a);
    result.g += cm[2][1];

    result.b = (cm[2][2] * c.r);
    result.b += (cm[2][3] * c.g);
    result.b += (cm[3][0] * c.b);
    result.b += (cm[3][1] * c.a);
    result.b += cm[3][2];

    result.a = (cm[3][3] * c.r);
    result.a += (cm[4][0] * c.g);
    result.a += (cm[4][1] * c.b);
    result.a += (cm[4][2] * c.a);
    result.a += cm[4][3];

    var rgb = mix(c.rgb, result.rgb, colorMatrixUniforms.uAlpha);

    rgb.r *= result.a;
    rgb.g *= result.a;
    rgb.b *= result.a;

    return vec4(rgb, result.a);
}`,A=class extends b{constructor(e={}){let t=new v({uColorMatrix:{value:[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],type:`f32`,size:20},uAlpha:{value:1,type:`f32`}}),n=S.from({vertex:{source:Zt,entryPoint:`mainVertex`},fragment:{source:Zt,entryPoint:`mainFragment`}}),r=_.from({vertex:ce,fragment:Xt,name:`color-matrix-filter`});super({...e,gpuProgram:n,glProgram:r,resources:{colorMatrixUniforms:t}}),this.alpha=1}_loadMatrix(e,t=!1){if(t){let t=[...e];this._multiply(t,this.matrix,e),this.resources.colorMatrixUniforms.uniforms.uColorMatrix=t}else this.resources.colorMatrixUniforms.uniforms.uColorMatrix=e;this.resources.colorMatrixUniforms.update()}_multiply(e,t,n){return e[0]=t[0]*n[0]+t[1]*n[5]+t[2]*n[10]+t[3]*n[15],e[1]=t[0]*n[1]+t[1]*n[6]+t[2]*n[11]+t[3]*n[16],e[2]=t[0]*n[2]+t[1]*n[7]+t[2]*n[12]+t[3]*n[17],e[3]=t[0]*n[3]+t[1]*n[8]+t[2]*n[13]+t[3]*n[18],e[4]=t[0]*n[4]+t[1]*n[9]+t[2]*n[14]+t[3]*n[19]+t[4],e[5]=t[5]*n[0]+t[6]*n[5]+t[7]*n[10]+t[8]*n[15],e[6]=t[5]*n[1]+t[6]*n[6]+t[7]*n[11]+t[8]*n[16],e[7]=t[5]*n[2]+t[6]*n[7]+t[7]*n[12]+t[8]*n[17],e[8]=t[5]*n[3]+t[6]*n[8]+t[7]*n[13]+t[8]*n[18],e[9]=t[5]*n[4]+t[6]*n[9]+t[7]*n[14]+t[8]*n[19]+t[9],e[10]=t[10]*n[0]+t[11]*n[5]+t[12]*n[10]+t[13]*n[15],e[11]=t[10]*n[1]+t[11]*n[6]+t[12]*n[11]+t[13]*n[16],e[12]=t[10]*n[2]+t[11]*n[7]+t[12]*n[12]+t[13]*n[17],e[13]=t[10]*n[3]+t[11]*n[8]+t[12]*n[13]+t[13]*n[18],e[14]=t[10]*n[4]+t[11]*n[9]+t[12]*n[14]+t[13]*n[19]+t[14],e[15]=t[15]*n[0]+t[16]*n[5]+t[17]*n[10]+t[18]*n[15],e[16]=t[15]*n[1]+t[16]*n[6]+t[17]*n[11]+t[18]*n[16],e[17]=t[15]*n[2]+t[16]*n[7]+t[17]*n[12]+t[18]*n[17],e[18]=t[15]*n[3]+t[16]*n[8]+t[17]*n[13]+t[18]*n[18],e[19]=t[15]*n[4]+t[16]*n[9]+t[17]*n[14]+t[18]*n[19]+t[19],e}brightness(e,t){let n=[e,0,0,0,0,0,e,0,0,0,0,0,e,0,0,0,0,0,1,0];this._loadMatrix(n,t)}tint(e,t){let[n,r,i]=g.shared.setValue(e).toArray(),a=[n,0,0,0,0,0,r,0,0,0,0,0,i,0,0,0,0,0,1,0];this._loadMatrix(a,t)}greyscale(e,t){let n=[e,e,e,0,0,e,e,e,0,0,e,e,e,0,0,0,0,0,1,0];this._loadMatrix(n,t)}grayscale(e,t){this.greyscale(e,t)}blackAndWhite(e){this._loadMatrix([.3,.6,.1,0,0,.3,.6,.1,0,0,.3,.6,.1,0,0,0,0,0,1,0],e)}hue(e,t){e=(e||0)/180*Math.PI;let n=Math.cos(e),r=Math.sin(e),i=Math.sqrt,a=1/3,o=i(a),s=[n+(1-n)*a,a*(1-n)-o*r,a*(1-n)+o*r,0,0,a*(1-n)+o*r,n+a*(1-n),a*(1-n)-o*r,0,0,a*(1-n)-o*r,a*(1-n)+o*r,n+a*(1-n),0,0,0,0,0,1,0];this._loadMatrix(s,t)}contrast(e,t){let n=(e||0)+1,r=-.5*(n-1),i=[n,0,0,0,r,0,n,0,0,r,0,0,n,0,r,0,0,0,1,0];this._loadMatrix(i,t)}saturate(e=0,t){let n=e*2/3+1,r=(n-1)*-.5,i=[n,r,r,0,0,r,n,r,0,0,r,r,n,0,0,0,0,0,1,0];this._loadMatrix(i,t)}desaturate(){this.saturate(-1)}negative(e){this._loadMatrix([-1,0,0,1,0,0,-1,0,1,0,0,0,-1,1,0,0,0,0,1,0],e)}sepia(e){this._loadMatrix([.393,.7689999,.18899999,0,0,.349,.6859999,.16799999,0,0,.272,.5339999,.13099999,0,0,0,0,0,1,0],e)}technicolor(e){this._loadMatrix([1.9125277891456083,-.8545344976951645,-.09155508482755585,0,.046249425232852304,-.3087833385928097,1.7658908555458428,-.10601743074722245,0,-.2758903984886823,-.231103377548616,-.7501899197440212,1.847597816108189,0,.12137623870388682,0,0,0,1,0],e)}polaroid(e){this._loadMatrix([1.438,-.062,-.062,0,0,-.122,1.378,-.122,0,0,-.016,-.016,1.483,0,0,0,0,0,1,0],e)}toBGR(e){this._loadMatrix([0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0],e)}kodachrome(e){this._loadMatrix([1.1285582396593525,-.3967382283601348,-.03992559172921793,0,.24991995145868634,-.16404339962244616,1.0835251566291304,-.05498805115633132,0,.09698983488904393,-.16786010706155763,-.5603416277695248,1.6014850761964943,0,.13972481597886063,0,0,0,1,0],e)}browni(e){this._loadMatrix([.5997023498159715,.34553243048391263,-.2708298674538042,0,.1860075629647401,-.037703249837783157,.8609577587992641,.15059552388459913,0,-.14497417640467167,.24113635128153335,-.07441037908422492,.44972182064877153,0,-.029655197167024642,0,0,0,1,0],e)}vintage(e){this._loadMatrix([.6279345635605994,.3202183420819367,-.03965408211312453,0,.037848179746251466,.02578397704808868,.6441188644374771,.03259127616149294,0,.029265996770472907,.0466055556782719,-.0851232987247891,.5241648018700465,0,.020232119953863904,0,0,0,1,0],e)}colorTone(e,t,n,r,i){e||=.2,t||=.15,n||=16770432,r||=3375104;let a=g.shared,[o,s,c]=a.setValue(n).toArray(),[l,u,d]=a.setValue(r).toArray(),f=[.3,.59,.11,0,0,o,s,c,e,0,l,u,d,t,0,o-l,s-u,c-d,0,0];this._loadMatrix(f,i)}night(e,t){e||=.1;let n=[e*-2,-e,0,0,0,-e,0,e,0,0,0,e,e*2,0,0,0,0,0,1,0];this._loadMatrix(n,t)}predator(e,t){let n=[11.224130630493164*e,-4.794486999511719*e,-2.8746118545532227*e,0*e,.40342438220977783*e,-3.6330697536468506*e,9.193157196044922*e,-2.951810836791992*e,0*e,-1.316135048866272*e,-3.2184197902679443*e,-4.2375030517578125*e,7.476448059082031*e,0*e,.8044459223747253*e,0,0,0,1,0];this._loadMatrix(n,t)}lsd(e){this._loadMatrix([2,-.4,.5,0,0,-.5,2,-.4,0,0,-.4,-.5,3,0,0,0,0,0,1,0],e)}reset(){this._loadMatrix([1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],!1)}get matrix(){return this.resources.colorMatrixUniforms.uniforms.uColorMatrix}set matrix(e){this.resources.colorMatrixUniforms.uniforms.uColorMatrix=e}get alpha(){return this.resources.colorMatrixUniforms.uniforms.uAlpha}set alpha(e){this.resources.colorMatrixUniforms.uniforms.uAlpha=e}},Qt=`
in vec2 vTextureCoord;
in vec4 vColor;

out vec4 finalColor;

uniform float uNoise;
uniform float uSeed;
uniform sampler2D uTexture;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    float randomValue = rand(gl_FragCoord.xy * uSeed);
    float diff = (randomValue - 0.5) *  uNoise;

    // Un-premultiply alpha before applying the color matrix. See issue #3539.
    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    color.r += diff;
    color.g += diff;
    color.b += diff;

    // Premultiply alpha again.
    color.rgb *= color.a;

    finalColor = color;
}
`,$t=`

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct NoiseUniforms {
  uNoise:f32,
  uSeed:f32,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> noiseUniforms : NoiseUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}

fn rand(co:vec2<f32>) -> f32
{
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}



@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {

    var pixelPosition =  globalTextureCoord(position.xy);// / (getSize());//-  gfu.uOutputFrame.xy);
  
    
    var sample = textureSample(uTexture, uSampler, uv);
    var randomValue =  rand(pixelPosition.xy * noiseUniforms.uSeed);
    var diff = (randomValue - 0.5) * noiseUniforms.uNoise;
  
    // Un-premultiply alpha before applying the color matrix. See issue #3539.
    if (sample.a > 0.0) {
      sample.r /= sample.a;
      sample.g /= sample.a;
      sample.b /= sample.a;
    }

    sample.r += diff;
    sample.g += diff;
    sample.b += diff;

    // Premultiply alpha again.
    sample.r *= sample.a;
    sample.g *= sample.a;
    sample.b *= sample.a;
    
    return sample;
}`,en=class e extends b{constructor(t={}){t={...e.defaultOptions,...t};let n=S.from({vertex:{source:$t,entryPoint:`mainVertex`},fragment:{source:$t,entryPoint:`mainFragment`}}),r=_.from({vertex:ce,fragment:Qt,name:`noise-filter`}),{noise:i,seed:a,...o}=t;super({...o,gpuProgram:n,glProgram:r,resources:{noiseUniforms:new v({uNoise:{value:1,type:`f32`},uSeed:{value:1,type:`f32`}})}}),this.noise=i,this.seed=a??Math.random()}get noise(){return this.resources.noiseUniforms.uniforms.uNoise}set noise(e){this.resources.noiseUniforms.uniforms.uNoise=e}get seed(){return this.resources.noiseUniforms.uniforms.uSeed}set seed(e){this.resources.noiseUniforms.uniforms.uSeed=e}};en.defaultOptions={noise:.5};var tn=en,j=`in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,M=`struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}`,nn=`
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uOffset;

void main(void)
{
    vec4 color = vec4(0.0);

    // Sample top left pixel
    color += texture(uTexture, vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y + uOffset.y));

    // Sample top right pixel
    color += texture(uTexture, vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y + uOffset.y));

    // Sample bottom right pixel
    color += texture(uTexture, vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y - uOffset.y));

    // Sample bottom left pixel
    color += texture(uTexture, vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y - uOffset.y));

    // Average
    color *= 0.25;

    finalColor = color;
}`,rn=`struct KawaseBlurUniforms {
  uOffset:vec2<f32>,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> kawaseBlurUniforms : KawaseBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uOffset = kawaseBlurUniforms.uOffset;
  var color: vec4<f32> = vec4<f32>(0.0);

  // Sample top left pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x - uOffset.x, uv.y + uOffset.y));
  // Sample top right pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x + uOffset.x, uv.y + uOffset.y));
  // Sample bottom right pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x + uOffset.x, uv.y - uOffset.y));
  // Sample bottom left pixel
  color += textureSample(uTexture, uSampler, vec2<f32>(uv.x - uOffset.x, uv.y - uOffset.y));
  // Average
  color *= 0.25;

  return color;
}`,an=`
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uOffset;

uniform vec4 uInputClamp;

void main(void)
{
    vec4 color = vec4(0.0);

    // Sample top left pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y + uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Sample top right pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y + uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Sample bottom right pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x + uOffset.x, vTextureCoord.y - uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Sample bottom left pixel
    color += texture(uTexture, clamp(vec2(vTextureCoord.x - uOffset.x, vTextureCoord.y - uOffset.y), uInputClamp.xy, uInputClamp.zw));

    // Average
    color *= 0.25;

    finalColor = color;
}
`,on=`struct KawaseBlurUniforms {
  uOffset:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> kawaseBlurUniforms : KawaseBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uOffset = kawaseBlurUniforms.uOffset;
  var color: vec4<f32> = vec4(0.0);

  // Sample top left pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x - uOffset.x, uv.y + uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Sample top right pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x + uOffset.x, uv.y + uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Sample bottom right pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x + uOffset.x, uv.y - uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Sample bottom left pixel
  color += textureSample(uTexture, uSampler, clamp(vec2<f32>(uv.x - uOffset.x, uv.y - uOffset.y), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
  // Average
  color *= 0.25;
    
  return color;
}`,sn=Object.defineProperty,cn=(e,t,n)=>t in e?sn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,N=(e,t,n)=>(cn(e,typeof t==`symbol`?t:t+``,n),n),ln=class e extends b{constructor(...t){let n=t[0]??{};(typeof n==`number`||Array.isArray(n))&&(u(`6.0.0`,`KawaseBlurFilter constructor params are now options object. See params: { strength, quality, clamp, pixelSize }`),n={strength:n},t[1]!==void 0&&(n.quality=t[1]),t[2]!==void 0&&(n.clamp=t[2])),n={...e.DEFAULT_OPTIONS,...n};let r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:n?.clamp?on:rn,entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:n?.clamp?an:nn,name:`kawase-blur-filter`});super({gpuProgram:r,glProgram:i,resources:{kawaseBlurUniforms:{uOffset:{value:new Float32Array(2),type:`vec2<f32>`}}}}),N(this,`uniforms`),N(this,`_pixelSize`,{x:0,y:0}),N(this,`_clamp`),N(this,`_kernels`,[]),N(this,`_blur`),N(this,`_quality`),this.uniforms=this.resources.kawaseBlurUniforms.uniforms,this.pixelSize=n.pixelSize??{x:1,y:1},Array.isArray(n.strength)?this.kernels=n.strength:typeof n.strength==`number`&&(this._blur=n.strength,this.quality=n.quality??3),this._clamp=!!n.clamp}apply(e,t,n,r){let i=this.pixelSizeX/t.source.width,a=this.pixelSizeY/t.source.height,o;if(this._quality===1||this._blur===0)o=this._kernels[0]+.5,this.uniforms.uOffset[0]=o*i,this.uniforms.uOffset[1]=o*a,e.applyFilter(this,t,n,r);else{let s=y.getSameSizeTexture(t),c=t,l=s,u,d=this._quality-1;for(let t=0;t<d;t++)o=this._kernels[t]+.5,this.uniforms.uOffset[0]=o*i,this.uniforms.uOffset[1]=o*a,e.applyFilter(this,c,l,!0),u=c,c=l,l=u;o=this._kernels[d]+.5,this.uniforms.uOffset[0]=o*i,this.uniforms.uOffset[1]=o*a,e.applyFilter(this,c,n,r),y.returnTexture(s)}}get strength(){return this._blur}set strength(e){this._blur=e,this._generateKernels()}get quality(){return this._quality}set quality(e){this._quality=Math.max(1,Math.round(e)),this._generateKernels()}get kernels(){return this._kernels}set kernels(e){Array.isArray(e)&&e.length>0?(this._kernels=e,this._quality=e.length,this._blur=Math.max(...e)):(this._kernels=[0],this._quality=1)}get pixelSize(){return this._pixelSize}set pixelSize(e){typeof e==`number`?this.pixelSizeX=this.pixelSizeY=e:Array.isArray(e)?(this.pixelSizeX=e[0],this.pixelSizeY=e[1]):this._pixelSize=e}get pixelSizeX(){return this.pixelSize.x}set pixelSizeX(e){this.pixelSize.x=e}get pixelSizeY(){return this.pixelSize.y}set pixelSizeY(e){this.pixelSize.y=e}get clamp(){return this._clamp}_updatePadding(){this.padding=Math.ceil(this._kernels.reduce((e,t)=>e+t+.5,0))}_generateKernels(){let e=this._blur,t=this._quality,n=[e];if(e>0){let r=e,i=e/t;for(let e=1;e<t;e++)r-=i,n.push(r)}this._kernels=n,this._updatePadding()}};N(ln,`DEFAULT_OPTIONS`,{strength:4,quality:3,clamp:!1,pixelSize:{x:1,y:1}});var un=ln,dn=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uMapTexture;
uniform float uBloomScale;
uniform float uBrightness;

void main() {
    vec4 color = texture(uTexture, vTextureCoord);
    color.rgb *= uBrightness;
    vec4 bloomColor = vec4(texture(uMapTexture, vTextureCoord).rgb, 0.0);
    bloomColor.rgb *= uBloomScale;
    finalColor = color + bloomColor;
}
`,fn=`struct AdvancedBloomUniforms {
  uBloomScale: f32,
  uBrightness: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> advancedBloomUniforms : AdvancedBloomUniforms;
@group(1) @binding(1) var uMapTexture: texture_2d<f32>;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  color = vec4<f32>(color.rgb * advancedBloomUniforms.uBrightness, color.a);

  var bloomColor = vec4<f32>(textureSample(uMapTexture, uSampler, uv).rgb, 0.0);
  bloomColor = vec4<f32>(bloomColor.rgb * advancedBloomUniforms.uBloomScale, bloomColor.a);
  
  return color + bloomColor;
}
`,pn=`
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uThreshold;

void main() {
    vec4 color = texture(uTexture, vTextureCoord);

    // A simple & fast algorithm for getting brightness.
    // It's inaccuracy , but good enought for this feature.
    float _max = max(max(color.r, color.g), color.b);
    float _min = min(min(color.r, color.g), color.b);
    float brightness = (_max + _min) * 0.5;

    if(brightness > uThreshold) {
        finalColor = color;
    } else {
        finalColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
`,mn=`struct ExtractBrightnessUniforms {
  uThreshold: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> extractBrightnessUniforms : ExtractBrightnessUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  // A simple & fast algorithm for getting brightness.
  // It's inaccurate, but good enough for this feature.
  let max: f32 = max(max(color.r, color.g), color.b);
  let min: f32 = min(min(color.r, color.g), color.b);
  let brightness: f32 = (max + min) * 0.5;

  return select(vec4<f32>(0.), color, brightness > extractBrightnessUniforms.uThreshold);
}
`,hn=Object.defineProperty,gn=(e,t,n)=>t in e?hn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,_n=(e,t,n)=>(gn(e,typeof t==`symbol`?t:t+``,n),n),vn=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:mn,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:pn,name:`extract-brightness-filter`});super({gpuProgram:n,glProgram:r,resources:{extractBrightnessUniforms:{uThreshold:{value:t.threshold,type:`f32`}}}}),_n(this,`uniforms`),this.uniforms=this.resources.extractBrightnessUniforms.uniforms}get threshold(){return this.uniforms.uThreshold}set threshold(e){this.uniforms.uThreshold=e}};_n(vn,`DEFAULT_OPTIONS`,{threshold:.5});var yn=vn,bn=Object.defineProperty,xn=(e,t,n)=>t in e?bn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,P=(e,t,n)=>(xn(e,typeof t==`symbol`?t:t+``,n),n),Sn=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:fn,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:dn,name:`advanced-bloom-filter`});super({gpuProgram:n,glProgram:r,resources:{advancedBloomUniforms:{uBloomScale:{value:t.bloomScale,type:`f32`},uBrightness:{value:t.brightness,type:`f32`}},uMapTexture:f.WHITE}}),P(this,`uniforms`),P(this,`bloomScale`,1),P(this,`brightness`,1),P(this,`_extractFilter`),P(this,`_blurFilter`),this.uniforms=this.resources.advancedBloomUniforms.uniforms,this._extractFilter=new yn({threshold:t.threshold}),this._blurFilter=new un({strength:t.kernels??t.blur,quality:t.kernels?void 0:t.quality}),Object.assign(this,t)}apply(e,t,n,r){let i=y.getSameSizeTexture(t);this._extractFilter.apply(e,t,i,!0);let a=y.getSameSizeTexture(t);this._blurFilter.apply(e,i,a,!0),this.uniforms.uBloomScale=this.bloomScale,this.uniforms.uBrightness=this.brightness,this.resources.uMapTexture=a.source,e.applyFilter(this,t,n,r),y.returnTexture(a),y.returnTexture(i)}get threshold(){return this._extractFilter.threshold}set threshold(e){this._extractFilter.threshold=e}get kernels(){return this._blurFilter.kernels}set kernels(e){this._blurFilter.kernels=e}get blur(){return this._blurFilter.strength}set blur(e){this._blurFilter.strength=e}get quality(){return this._blurFilter.quality}set quality(e){this._blurFilter.quality=e}get pixelSize(){return this._blurFilter.pixelSize}set pixelSize(e){typeof e==`number`&&(e={x:e,y:e}),Array.isArray(e)&&(e={x:e[0],y:e[1]}),this._blurFilter.pixelSize=e}get pixelSizeX(){return this._blurFilter.pixelSizeX}set pixelSizeX(e){this._blurFilter.pixelSizeX=e}get pixelSizeY(){return this._blurFilter.pixelSizeY}set pixelSizeY(e){this._blurFilter.pixelSizeY=e}};P(Sn,`DEFAULT_OPTIONS`,{threshold:.5,bloomScale:1,brightness:1,blur:8,quality:4,pixelSize:{x:1,y:1}});var Cn=Sn,wn=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uSize;
uniform vec3 uColor;
uniform float uReplaceColor;

uniform vec4 uInputSize;

vec2 mapCoord( vec2 coord )
{
    coord *= uInputSize.xy;
    coord += uInputSize.zw;

    return coord;
}

vec2 unmapCoord( vec2 coord )
{
    coord -= uInputSize.zw;
    coord /= uInputSize.xy;

    return coord;
}

vec2 pixelate(vec2 coord, vec2 size)
{
    return floor(coord / size) * size;
}

vec2 getMod(vec2 coord, vec2 size)
{
    return mod(coord, size) / size;
}

float character(float n, vec2 p)
{
    p = floor(p*vec2(4.0, 4.0) + 2.5);

    if (clamp(p.x, 0.0, 4.0) == p.x)
    {
        if (clamp(p.y, 0.0, 4.0) == p.y)
        {
            if (int(mod(n/exp2(p.x + 5.0*p.y), 2.0)) == 1) return 1.0;
        }
    }
    return 0.0;
}

void main()
{
    vec2 coord = mapCoord(vTextureCoord);

    // get the grid position
    vec2 pixCoord = pixelate(coord, vec2(uSize));
    pixCoord = unmapCoord(pixCoord);

    // sample the color at grid position
    vec4 color = texture(uTexture, pixCoord);

    // brightness of the color as it's perceived by the human eye
    float gray = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;

    // determine the character to use
    float n =  65536.0;             // .
    if (gray > 0.2) n = 65600.0;    // :
    if (gray > 0.3) n = 332772.0;   // *
    if (gray > 0.4) n = 15255086.0; // o
    if (gray > 0.5) n = 23385164.0; // &
    if (gray > 0.6) n = 15252014.0; // 8
    if (gray > 0.7) n = 13199452.0; // @
    if (gray > 0.8) n = 11512810.0; // #

    // get the mod..
    vec2 modd = getMod(coord, vec2(uSize));

    finalColor = (uReplaceColor > 0.5 ? vec4(uColor, 1.) : color) * character( n, vec2(-1.0) + modd * 2.0);
}
`,Tn=`struct AsciiUniforms {
    uSize: f32,
    uColor: vec3<f32>,
    uReplaceColor: f32,
};

struct GlobalFilterUniforms {
    uInputSize:vec4<f32>,
    uInputPixel:vec4<f32>,
    uInputClamp:vec4<f32>,
    uOutputFrame:vec4<f32>,
    uGlobalFrame:vec4<f32>,
    uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> asciiUniforms : AsciiUniforms;

@fragment
fn mainFragment(
    @location(0) uv: vec2<f32>,
    @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let pixelSize: f32 = asciiUniforms.uSize;
    let coord: vec2<f32> = mapCoord(uv);

    // get the rounded color..
    var pixCoord: vec2<f32> = pixelate(coord, vec2<f32>(pixelSize));
    pixCoord = unmapCoord(pixCoord);

    var color = textureSample(uTexture, uSampler, pixCoord);

    // determine the character to use
    let gray: f32 = 0.3 * color.r + 0.59 * color.g + 0.11 * color.b;
    
    var n: f32 = 65536.0; // .
    if (gray > 0.2) {
        n = 65600.0;    // :
    }
    if (gray > 0.3) {
        n = 332772.0;   // *
    }
    if (gray > 0.4) {
        n = 15255086.0; // o
    }
    if (gray > 0.5) {
        n = 23385164.0; // &
    }
    if (gray > 0.6) {
        n = 15252014.0; // 8
    }
    if (gray > 0.7) {
        n = 13199452.0; // @
    }
    if (gray > 0.8) {
        n = 11512810.0; // #
    }

    // get the mod..
    let modd: vec2<f32> = getMod(coord, vec2<f32>(pixelSize));
    return select(color, vec4<f32>(asciiUniforms.uColor, 1.), asciiUniforms.uReplaceColor > 0.5) * character(n, vec2<f32>(-1.0) + modd * 2.0);
}

fn pixelate(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32>
{
    return floor( coord / size ) * size;
}

fn getMod(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32>
{
    return moduloVec2( coord , size) / size;
}

fn character(n: f32, p: vec2<f32>) -> f32
{
    var q: vec2<f32> = floor(p*vec2<f32>(4.0, 4.0) + 2.5);

    if (clamp(q.x, 0.0, 4.0) == q.x)
    {
        if (clamp(q.y, 0.0, 4.0) == q.y)
        {
        if (i32(modulo(n/exp2(q.x + 5.0*q.y), 2.0)) == 1)
        {
            return 1.0;
        }
        }
    }

    return 0.0;
}

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn moduloVec2(x: vec2<f32>, y: vec2<f32>) -> vec2<f32>
{
  return x - y * floor(x/y);
}

fn mapCoord(coord: vec2<f32> ) -> vec2<f32>
{
    var mappedCoord: vec2<f32> = coord;
    mappedCoord *= gfu.uInputSize.xy;
    mappedCoord += gfu.uOutputFrame.xy;
    return mappedCoord;
}

fn unmapCoord(coord: vec2<f32> ) -> vec2<f32>
{
    var mappedCoord: vec2<f32> = coord;
    mappedCoord -= gfu.uOutputFrame.xy;
    mappedCoord /= gfu.uInputSize.xy;
    return mappedCoord;
}`,En=Object.defineProperty,Dn=(e,t,n)=>t in e?En(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,On=(e,t,n)=>(Dn(e,typeof t==`symbol`?t:t+``,n),n),kn=class e extends b{constructor(...t){let n=t[0]??{};typeof n==`number`&&(u(`6.0.0`,`AsciiFilter constructor params are now options object. See params: { size, color, replaceColor }`),n={size:n});let r=n?.color&&n.replaceColor!==!1;n={...e.DEFAULT_OPTIONS,...n};let i=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Tn,entryPoint:`mainFragment`}}),a=_.from({vertex:j,fragment:wn,name:`ascii-filter`});super({gpuProgram:i,glProgram:a,resources:{asciiUniforms:{uSize:{value:n.size,type:`f32`},uColor:{value:new Float32Array(3),type:`vec3<f32>`},uReplaceColor:{value:Number(r),type:`f32`}}}}),On(this,`uniforms`),On(this,`_color`),this.uniforms=this.resources.asciiUniforms.uniforms,this._color=new g,this.color=n.color??16777215}get size(){return this.uniforms.uSize}set size(e){this.uniforms.uSize=e}get color(){return this._color.value}set color(e){this._color.setValue(e);let[t,n,r]=this._color.toArray();this.uniforms.uColor[0]=t,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get replaceColor(){return this.uniforms.uReplaceColor>.5}set replaceColor(e){this.uniforms.uReplaceColor=+!!e}};On(kn,`DEFAULT_OPTIONS`,{size:8,color:16777215,replaceColor:!1});var An=kn,jn=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uDimensions;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

void main()
{
    vec2 coord = vTextureCoord * uInputSize.xy;
    coord -= uCenter * uDimensions.xy;
    float distance = length(coord);

    if (distance < uRadius) {
        float percent = distance / uRadius;
        if (uStrength > 0.0) {
            coord *= mix(1.0, smoothstep(0.0, uRadius / distance, percent), uStrength * 0.75);
        } else {
            coord *= mix(1.0, pow(percent, 1.0 + uStrength * 0.75) * uRadius / distance, 1.0 - percent);
        }
    }

    coord += uCenter * uDimensions.xy;
    coord /= uInputSize.xy;
    vec2 clampedCoord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, clampedCoord);

    if (coord != clampedCoord) {
        color *= max(0.0, 1.0 - length(coord - clampedCoord));
    }

    finalColor = color;
}
`,Mn=`struct BulgePinchUniforms {
  uDimensions: vec2<f32>,
  uCenter: vec2<f32>,
  uRadius: f32,
  uStrength: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> bulgePinchUniforms : BulgePinchUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let dimensions: vec2<f32> = bulgePinchUniforms.uDimensions;
  let center: vec2<f32> = bulgePinchUniforms.uCenter;
  let radius: f32 = bulgePinchUniforms.uRadius;
  let strength: f32 = bulgePinchUniforms.uStrength;
  var coord: vec2<f32> = (uv * gfu.uInputSize.xy) - center * dimensions.xy;

  let distance: f32 = length(coord);

  if (distance < radius) {
      let percent: f32 = distance / radius;
      if (strength > 0.0) {
          coord *= mix(1.0, smoothstep(0.0, radius / distance, percent), strength * 0.75);
      } else {
          coord *= mix(1.0, pow(percent, 1.0 + strength * 0.75) * radius / distance, 1.0 - percent);
      }
  }
    coord += (center * dimensions.xy);
    coord /= gfu.uInputSize.xy;

    let clampedCoord: vec2<f32> = clamp(coord, gfu.uInputClamp.xy, gfu.uInputClamp.zw);
    var color: vec4<f32> = textureSample(uTexture, uSampler, clampedCoord);
    if (coord.x != clampedCoord.x && coord.y != clampedCoord.y) {
        color *= max(0.0, 1.0 - length(coord - clampedCoord));
    }

    return color;
}

fn compareVec2(x: vec2<f32>, y: vec2<f32>) -> bool
{
  if (x.x == y.x && x.y == y.y)
  {
    return true;
  }

  return false;
}`,Nn=Object.defineProperty,Pn=(e,t,n)=>t in e?Nn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Fn=(e,t,n)=>(Pn(e,typeof t==`symbol`?t:t+``,n),n),In=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Mn,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:jn,name:`bulge-pinch-filter`});super({gpuProgram:n,glProgram:r,resources:{bulgePinchUniforms:{uDimensions:{value:[0,0],type:`vec2<f32>`},uCenter:{value:{x:0,y:0},type:`vec2<f32>`},uRadius:{value:t.radius,type:`f32`},uStrength:{value:t.strength,type:`f32`}}}}),Fn(this,`uniforms`),this.uniforms=this.resources.bulgePinchUniforms.uniforms,Object.assign(this,t)}apply(e,t,n,r){this.uniforms.uDimensions[0]=t.frame.width,this.uniforms.uDimensions[1]=t.frame.height,e.applyFilter(this,t,n,r)}get center(){return this.uniforms.uCenter}set center(e){typeof e==`number`&&(e={x:e,y:e}),Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uCenter=e}get centerX(){return this.uniforms.uCenter.x}set centerX(e){this.uniforms.uCenter.x=e}get centerY(){return this.uniforms.uCenter.y}set centerY(e){this.uniforms.uCenter.y=e}get radius(){return this.uniforms.uRadius}set radius(e){this.uniforms.uRadius=e}get strength(){return this.uniforms.uStrength}set strength(e){this.uniforms.uStrength=e}};Fn(In,`DEFAULT_OPTIONS`,{center:{x:.5,y:.5},radius:100,strength:1});var Ln=In,Rn=`precision highp float;
in vec2 vTextureCoord;
in vec2 vFilterCoord;
out vec4 finalColor;

const int TYPE_LINEAR = 0;
const int TYPE_RADIAL = 1;
const int TYPE_CONIC = 2;
const int MAX_STOPS = 32;

uniform sampler2D uTexture;
uniform vec4 uOptions;
uniform vec2 uCounts;
uniform vec3 uColors[MAX_STOPS];
uniform vec4 uStops[MAX_STOPS];

const float PI = 3.1415926538;
const float PI_2 = PI*2.;

struct ColorStop {
    float offset;
    vec3 color;
    float alpha;
};

mat2 rotate2d(float angle){
    return mat2(cos(angle), -sin(angle),
    sin(angle), cos(angle));
}

float projectLinearPosition(vec2 pos, float angle){
    vec2 center = vec2(0.5);
    vec2 result = pos - center;
    result = rotate2d(angle) * result;
    result = result + center;
    return clamp(result.x, 0., 1.);
}

float projectRadialPosition(vec2 pos) {
    float r = distance(pos, vec2(0.5));
    return clamp(2.*r, 0., 1.);
}

float projectAnglePosition(vec2 pos, float angle) {
    vec2 center = pos - vec2(0.5);
    float polarAngle=atan(-center.y, center.x);
    return mod(polarAngle + angle, PI_2) / PI_2;
}

float projectPosition(vec2 pos, int type, float angle) {
    if (type == TYPE_LINEAR) {
        return projectLinearPosition(pos, angle);
    } else if (type == TYPE_RADIAL) {
        return projectRadialPosition(pos);
    } else if (type == TYPE_CONIC) {
        return projectAnglePosition(pos, angle);
    }

    return pos.y;
}

void main(void) {
    int uType = int(uOptions[0]);
    float uAngle = uOptions[1];
    float uAlpha = uOptions[2];
    float uReplace = uOptions[3];

    int uNumStops = int(uCounts[0]);
    float uMaxColors = uCounts[1];

    // current/original color
    vec4 currentColor = texture(uTexture, vTextureCoord);

    // skip calculations if gradient alpha is 0
    if (0.0 == uAlpha) {
        finalColor = currentColor;
        return;
    }

    // project position
    float y = projectPosition(vFilterCoord, int(uType), radians(uAngle));

    // check gradient bounds
    float offsetMin = uStops[0][0];
    float offsetMax = 0.0;

    int numStops = int(uNumStops);

    for (int i = 0; i < MAX_STOPS; i++) {
        if (i == numStops-1){ // last index
            offsetMax = uStops[i][0];
        }
    }

    if (y  < offsetMin || y > offsetMax) {
        finalColor = currentColor;
        return;
    }

    // limit colors
    if (uMaxColors > 0.) {
        float stepSize = 1./uMaxColors;
        float stepNumber = float(floor(y/stepSize));
        y = stepSize * (stepNumber + 0.5);// offset by 0.5 to use color from middle of segment
    }

    // find color stops
    ColorStop from;
    ColorStop to;

    for (int i = 0; i < MAX_STOPS; i++) {
        if (y >= uStops[i][0]) {
            from = ColorStop(uStops[i][0], uColors[i], uStops[i][1]);
            to = ColorStop(uStops[i+1][0], uColors[i+1], uStops[i+1][1]);
        }

        if (i == numStops-1){ // last index
            break;
        }
    }

    // mix colors from stops
    vec4 colorFrom = vec4(from.color * from.alpha, from.alpha);
    vec4 colorTo = vec4(to.color * to.alpha, to.alpha);

    float segmentHeight = to.offset - from.offset;
    float relativePos = y - from.offset;// position from 0 to [segmentHeight]
    float relativePercent = relativePos / segmentHeight;// position in percent between [from.offset] and [to.offset].

    float gradientAlpha = uAlpha * currentColor.a;
    vec4 gradientColor = mix(colorFrom, colorTo, relativePercent) * gradientAlpha;

    if (uReplace < 0.5) {
        // mix resulting color with current color
        finalColor = gradientColor + currentColor*(1.-gradientColor.a);
    } else {
        // replace with gradient color
        finalColor = gradientColor;
    }
}
`,zn=`in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vFilterCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
    vFilterCoord = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
}
`,Bn=`struct BaseUniforms {
  uOptions: vec4<f32>,
  uCounts: vec2<f32>,
};

struct StopsUniforms {
  uColors: array<vec3<f32>, MAX_STOPS>,
  uStops: array<vec4<f32>, MAX_STOPS>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> baseUniforms : BaseUniforms;
@group(1) @binding(1) var<uniform> stopsUniforms : StopsUniforms;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) coord : vec2<f32>
};

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn filterCoord( vTextureCoord:vec2<f32> ) -> vec2<f32>
{
    return vTextureCoord * gfu.uInputSize.xy / gfu.uOutputFrame.zw;
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  let vTextureCoord: vec2<f32> = filterTextureCoord(aPosition);
  return VSOutput(
   filterVertexPosition(aPosition),
   vTextureCoord,
   filterCoord(vTextureCoord),
  );
}

struct ColorStop {
  offset: f32,
  color: vec3<f32>,
  alpha: f32,
};

fn rotate2d(angle: f32) -> mat2x2<f32>{
  return mat2x2(cos(angle), -sin(angle),
  sin(angle), cos(angle));
}

fn projectLinearPosition(pos: vec2<f32>, angle: f32) -> f32 {
  var center: vec2<f32> = vec2<f32>(0.5);
  var result: vec2<f32> = pos - center;
  result = rotate2d(angle) * result;
  result = result + center;
  return clamp(result.x, 0.0, 1.0);
}

fn projectRadialPosition(pos: vec2<f32>) -> f32 {
  var r: f32 = distance(pos, vec2<f32>(0.5));
  return clamp(2.0 * r, 0.0, 1.0);
}

fn projectAnglePosition(pos: vec2<f32>, angle: f32) -> f32 {
  var center: vec2<f32> = pos - vec2<f32>(0.5, 0.5);
  var polarAngle: f32 = atan2(-center.y, center.x);
  return ((polarAngle + angle) % PI_2) / PI_2;
}

fn projectPosition(pos: vec2<f32>, gradientType: i32, angle: f32) -> f32 {
  if (gradientType == TYPE_LINEAR) {
      return projectLinearPosition(pos, angle);
  } else if (gradientType == TYPE_RADIAL) {
      return projectRadialPosition(pos);
  } else if (gradientType == TYPE_CONIC) {
      return projectAnglePosition(pos, angle);
  }

  return pos.y;
}

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>,
  @location(1) coord : vec2<f32>
) -> @location(0) vec4<f32> {
  let uType: i32 = i32(baseUniforms.uOptions[0]);
  let uAngle: f32 = baseUniforms.uOptions[1];
  let uAlpha: f32 = baseUniforms.uOptions[2];
  let uReplace: f32 = baseUniforms.uOptions[3];

  let uNumStops: i32 = i32(baseUniforms.uCounts[0]);
  let uMaxColors: f32 = baseUniforms.uCounts[1];

  // current/original color
  var currentColor: vec4<f32> = textureSample(uTexture, uSampler, uv);

  // skip calculations if gradient alpha is 0
  if (uAlpha == 0.0) { return currentColor; }

  // project position
  var y: f32 = projectPosition(coord, uType, radians(uAngle));

  // check gradient bounds
  var offsetMin: f32 = stopsUniforms.uStops[0][0];
  var offsetMax: f32 = 0.0;

  let numStops: i32 = uNumStops;

  for (var i: i32 = 0; i < MAX_STOPS; i = i + 1) {
      if (i == numStops - 1) { // last index
          offsetMax = stopsUniforms.uStops[i][0];
      }
  }

  if (y  < offsetMin || y > offsetMax) { return currentColor; }

  // limit colors
  if (uMaxColors > 0.0) {
      var stepSize: f32 = 1.0 / uMaxColors;
      var stepNumber: f32 = floor(y / stepSize);
      y = stepSize * (stepNumber + 0.5); // offset by 0.5 to use color from middle of segment
  }

  // find color stops
  var stopFrom: ColorStop;
  var stopTo: ColorStop;

  for (var i: i32 = 0; i < MAX_STOPS; i = i + 1) {
      if (y >= stopsUniforms.uStops[i][0]) {
          stopFrom = ColorStop(stopsUniforms.uStops[i][0], stopsUniforms.uColors[i], stopsUniforms.uStops[i][1]);
          stopTo = ColorStop(stopsUniforms.uStops[i + 1][0], stopsUniforms.uColors[i + 1], stopsUniforms.uStops[i + 1][1]);
      }

      if (i == numStops - 1) { // last index
          break;
      }
  }

  // mix colors from stops
  var colorFrom: vec4<f32> = vec4<f32>(stopFrom.color * stopFrom.alpha, stopFrom.alpha);
  var colorTo: vec4<f32> = vec4<f32>(stopTo.color * stopTo.alpha, stopTo.alpha);

  var segmentHeight: f32 = stopTo.offset - stopFrom.offset;
  var relativePos: f32 = y - stopFrom.offset; // position from 0 to [segmentHeight]
  var relativePercent: f32 = relativePos / segmentHeight; // position in percent between [from.offset] and [to.offset].

  var gradientAlpha: f32 = uAlpha * currentColor.a;
  var gradientColor: vec4<f32> = mix(colorFrom, colorTo, relativePercent) * gradientAlpha;

  if (uReplace < 0.5) {
      // mix resulting color with current color
      return gradientColor + currentColor * (1.0 - gradientColor.a);
  } else {
      // replace with gradient color
      return gradientColor;
  }
}

const PI: f32 = 3.14159265358979323846264;
const PI_2: f32 = PI * 2.0;

const TYPE_LINEAR: i32 = 0;
const TYPE_RADIAL: i32 = 1;
const TYPE_CONIC: i32 = 2;
const MAX_STOPS: i32 = 32;`,F=F||{};F.stringify=(function(){var e={"visit_linear-gradient":function(t){return e.visit_gradient(t)},"visit_repeating-linear-gradient":function(t){return e.visit_gradient(t)},"visit_radial-gradient":function(t){return e.visit_gradient(t)},"visit_repeating-radial-gradient":function(t){return e.visit_gradient(t)},visit_gradient:function(t){var n=e.visit(t.orientation);return n&&(n+=`, `),t.type+`(`+n+e.visit(t.colorStops)+`)`},visit_shape:function(t){var n=t.value,r=e.visit(t.at),i=e.visit(t.style);return i&&(n+=` `+i),r&&(n+=` at `+r),n},"visit_default-radial":function(t){var n=``,r=e.visit(t.at);return r&&(n+=r),n},"visit_extent-keyword":function(t){var n=t.value,r=e.visit(t.at);return r&&(n+=` at `+r),n},"visit_position-keyword":function(e){return e.value},visit_position:function(t){return e.visit(t.value.x)+` `+e.visit(t.value.y)},"visit_%":function(e){return e.value+`%`},visit_em:function(e){return e.value+`em`},visit_px:function(e){return e.value+`px`},visit_literal:function(t){return e.visit_color(t.value,t)},visit_hex:function(t){return e.visit_color(`#`+t.value,t)},visit_rgb:function(t){return e.visit_color(`rgb(`+t.value.join(`, `)+`)`,t)},visit_rgba:function(t){return e.visit_color(`rgba(`+t.value.join(`, `)+`)`,t)},visit_color:function(t,n){var r=t,i=e.visit(n.length);return i&&(r+=` `+i),r},visit_angular:function(e){return e.value+`deg`},visit_directional:function(e){return`to `+e.value},visit_array:function(t){var n=``,r=t.length;return t.forEach(function(t,i){n+=e.visit(t),i<r-1&&(n+=`, `)}),n},visit:function(t){if(!t)return``;var n=``;if(t instanceof Array)return e.visit_array(t,n);if(t.type){var r=e[`visit_`+t.type];if(r)return r(t);throw Error(`Missing visitor visit_`+t.type)}throw Error(`Invalid node.`)}};return function(t){return e.visit(t)}})();var F=F||{};F.parse=(function(){var e={linearGradient:/^(\-(webkit|o|ms|moz)\-)?(linear\-gradient)/i,repeatingLinearGradient:/^(\-(webkit|o|ms|moz)\-)?(repeating\-linear\-gradient)/i,radialGradient:/^(\-(webkit|o|ms|moz)\-)?(radial\-gradient)/i,repeatingRadialGradient:/^(\-(webkit|o|ms|moz)\-)?(repeating\-radial\-gradient)/i,sideOrCorner:/^to (left (top|bottom)|right (top|bottom)|left|right|top|bottom)/i,extentKeywords:/^(closest\-side|closest\-corner|farthest\-side|farthest\-corner|contain|cover)/,positionKeywords:/^(left|center|right|top|bottom)/i,pixelValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,percentageValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))\%/,emValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))em/,angleValue:/^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,startCall:/^\(/,endCall:/^\)/,comma:/^,/,hexColor:/^\#([0-9a-fA-F]+)/,literalColor:/^([a-zA-Z]+)/,rgbColor:/^rgb/i,rgbaColor:/^rgba/i,number:/^(([0-9]*\.[0-9]+)|([0-9]+\.?))/},t=``;function n(e){var n=Error(t+`: `+e);throw n.source=t,n}function r(){var e=i();return t.length>0&&n(`Invalid input not EOF`),e}function i(){return v(a)}function a(){return o(`linear-gradient`,e.linearGradient,c)||o(`repeating-linear-gradient`,e.repeatingLinearGradient,c)||o(`radial-gradient`,e.radialGradient,d)||o(`repeating-radial-gradient`,e.repeatingRadialGradient,d)}function o(t,r,i){return s(r,function(r){var a=i();return a&&(E(e.comma)||n(`Missing comma before color stops`)),{type:t,orientation:a,colorStops:v(y)}})}function s(t,r){var i=E(t);if(i){E(e.startCall)||n(`Missing (`);var a=r(i);return E(e.endCall)||n(`Missing )`),a}}function c(){return l()||u()}function l(){return T(`directional`,e.sideOrCorner,1)}function u(){return T(`angular`,e.angleValue,1)}function d(){var n,r=f(),i;return r&&(n=[],n.push(r),i=t,E(e.comma)&&(r=f(),r?n.push(r):t=i)),n}function f(){var e=p()||m();if(e)e.at=g();else{var t=h();if(t){e=t;var n=g();n&&(e.at=n)}else{var r=_();r&&(e={type:`default-radial`,at:r})}}return e}function p(){var e=T(`shape`,/^(circle)/i,0);return e&&(e.style=ie()||h()),e}function m(){var e=T(`shape`,/^(ellipse)/i,0);return e&&(e.style=w()||h()),e}function h(){return T(`extent-keyword`,e.extentKeywords,1)}function g(){if(T(`position`,/^at/,0)){var e=_();return e||n(`Missing positioning value`),e}}function _(){var e=ee();if(e.x||e.y)return{type:`position`,value:e}}function ee(){return{x:w(),y:w()}}function v(t){var r=t(),i=[];if(r)for(i.push(r);E(e.comma);)r=t(),r?i.push(r):n(`One extra comma`);return i}function y(){var e=b();return e||n(`Expected color definition`),e.length=w(),e}function b(){return S()||C()||te()||x()}function x(){return T(`literal`,e.literalColor,0)}function S(){return T(`hex`,e.hexColor,1)}function te(){return s(e.rgbColor,function(){return{type:`rgb`,value:v(ne)}})}function C(){return s(e.rgbaColor,function(){return{type:`rgba`,value:v(ne)}})}function ne(){return E(e.number)[1]}function w(){return T(`%`,e.percentageValue,1)||re()||ie()}function re(){return T(`position-keyword`,e.positionKeywords,1)}function ie(){return T(`px`,e.pixelValue,1)||T(`em`,e.emValue,1)}function T(e,t,n){var r=E(t);if(r)return{type:e,value:r[n]}}function E(e){var n,r=/^[\n\r\t\s]+/.exec(t);return r&&ae(r[0].length),n=e.exec(t),n&&ae(n[0].length),n}function ae(e){t=t.substr(e)}return function(e){return t=e.toString(),r()}})();var Vn=F.parse;F.stringify;function Hn(e){let t=Vn(Xn(e));if(t.length===0)throw Error(`Invalid CSS gradient.`);if(t.length!==1)throw Error(`Unsupported CSS gradient (multiple gradients is not supported).`);let n=t[0];return{type:Un(n.type),stops:Wn(n.colorStops),angle:Jn(n.orientation)}}function Un(e){let t={"linear-gradient":0,"radial-gradient":1};if(!(e in t))throw Error(`Unsupported gradient type "${e}"`);return t[e]}function Wn(e){let t=Kn(e),n=[],r=new g;for(let i=0;i<e.length;i++){let a=Gn(e[i]),o=r.setValue(a).toArray();n.push({offset:t[i],color:o.slice(0,3),alpha:o[3]})}return n}function Gn(e){switch(e.type){case`hex`:return`#${e.value}`;case`literal`:return e.value;default:return`${e.type}(${e.value.join(`,`)})`}}function Kn(e){let t=[];for(let n=0;n<e.length;n++){let r=e[n],i=-1;r.type===`literal`&&r.length&&`type`in r.length&&r.length.type===`%`&&`value`in r.length&&(i=parseFloat(r.length.value)/100),t.push(i)}let n=e=>{for(let n=e;n<t.length;n++)if(t[n]!==-1)return{indexDelta:n-e,offset:t[n]};return{indexDelta:t.length-1-e,offset:1}},r=0;for(let e=0;e<t.length;e++){let i=t[e];if(i!==-1)r=i;else if(e===0)t[e]=0;else if(e+1===t.length)t[e]=1;else{let i=n(e),a=(i.offset-r)/(1+i.indexDelta);for(let n=0;n<=i.indexDelta;n++)t[e+n]=r+(n+1)*a;e+=i.indexDelta,r=t[e]}}return t.map(qn)}function qn(e){return e.toString().length>6?parseFloat(e.toString().substring(0,6)):e}function Jn(e){if(e===void 0)return 0;if(`type`in e&&`value`in e)switch(e.type){case`angular`:return parseFloat(e.value);case`directional`:return Yn(e.value)}return 0}function Yn(e){let t={left:270,top:0,bottom:180,right:90,"left top":315,"top left":315,"left bottom":225,"bottom left":225,"right top":45,"top right":45,"right bottom":135,"bottom right":135};if(!(e in t))throw Error(`Unsupported directional value "${e}"`);return t[e]}function Xn(e){let t=e.replace(/\s{2,}/gu,` `);return t=t.replace(/;/g,``),t=t.replace(/ ,/g,`,`),t=t.replace(/\( /g,`(`),t=t.replace(/ \)/g,`)`),t.trim()}var Zn=Object.defineProperty,Qn=(e,t,n)=>t in e?Zn(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,I=(e,t,n)=>(Qn(e,typeof t==`symbol`?t:t+``,n),n),$n=90;function er(e){return[...e].sort((e,t)=>e.offset-t.offset)}var L=class e extends b{constructor(t){if(t=t&&`css`in t?{...Hn(t.css||``),alpha:t.alpha??e.defaults.alpha,maxColors:t.maxColors??e.defaults.maxColors}:{...e.defaults,...t},!t.stops||t.stops.length<2)throw Error(`ColorGradientFilter requires at least 2 color stops.`);let n=S.from({vertex:{source:Bn,entryPoint:`mainVertex`},fragment:{source:Bn,entryPoint:`mainFragment`}}),r=_.from({vertex:zn,fragment:Rn,name:`color-gradient-filter`});super({gpuProgram:n,glProgram:r,resources:{baseUniforms:{uOptions:{value:[t.type,t.angle??$n,t.alpha,+!!t.replace],type:`vec4<f32>`},uCounts:{value:[t.stops.length,t.maxColors],type:`vec2<f32>`}},stopsUniforms:{uColors:{value:new Float32Array(96),type:`vec3<f32>`,size:32},uStops:{value:new Float32Array(128),type:`vec4<f32>`,size:32}}}}),I(this,`baseUniforms`),I(this,`stopsUniforms`),I(this,`_stops`,[]),this.baseUniforms=this.resources.baseUniforms.uniforms,this.stopsUniforms=this.resources.stopsUniforms.uniforms,Object.assign(this,t)}get stops(){return this._stops}set stops(e){let t=er(e),n=new g,r,i,a;for(let e=0;e<t.length;e++){n.setValue(t[e].color);let o=e*3;[r,i,a]=n.toArray(),this.stopsUniforms.uColors[o]=r,this.stopsUniforms.uColors[o+1]=i,this.stopsUniforms.uColors[o+2]=a,this.stopsUniforms.uStops[e*4]=t[e].offset,this.stopsUniforms.uStops[e*4+1]=t[e].alpha}this.baseUniforms.uCounts[0]=t.length,this._stops=t}get type(){return this.baseUniforms.uOptions[0]}set type(e){this.baseUniforms.uOptions[0]=e}get angle(){return this.baseUniforms.uOptions[1]+$n}set angle(e){this.baseUniforms.uOptions[1]=e-$n}get alpha(){return this.baseUniforms.uOptions[2]}set alpha(e){this.baseUniforms.uOptions[2]=e}get maxColors(){return this.baseUniforms.uCounts[1]}set maxColors(e){this.baseUniforms.uCounts[1]=e}get replace(){return this.baseUniforms.uOptions[3]>.5}set replace(e){this.baseUniforms.uOptions[3]=+!!e}};I(L,`LINEAR`,0),I(L,`RADIAL`,1),I(L,`CONIC`,2),I(L,`defaults`,{type:L.LINEAR,stops:[{offset:0,color:16711680,alpha:1},{offset:1,color:255,alpha:1}],alpha:1,angle:90,maxColors:0,replace:!1});var tr=L,nr=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec3 uColor;
uniform float uAlpha;

void main(void) {
    vec4 c = texture(uTexture, vTextureCoord);
    finalColor = vec4(mix(c.rgb, uColor * c.a, uAlpha), c.a);
}`,rr=`struct ColorOverlayUniforms {
    uColor: vec3<f32>,
    uAlpha: f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> colorOverlayUniforms : ColorOverlayUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    let c = textureSample(uTexture, uSampler, uv);
    return vec4<f32>(mix(c.rgb, colorOverlayUniforms.uColor.rgb * c.a, colorOverlayUniforms.uAlpha), c.a);
}
`,ir=Object.defineProperty,ar=(e,t,n)=>t in e?ir(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,or=(e,t,n)=>(ar(e,typeof t==`symbol`?t:t+``,n),n),sr=class e extends b{constructor(...t){let n=t[0]??{};(typeof n==`number`||Array.isArray(n)||n instanceof Float32Array)&&(u(`6.0.0`,`ColorOverlayFilter constructor params are now options object. See params: { color, alpha }`),n={color:n},t[1]!==void 0&&(n.alpha=t[1])),n={...e.DEFAULT_OPTIONS,...n};let r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:rr,entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:nr,name:`color-overlay-filter`});super({gpuProgram:r,glProgram:i,resources:{colorOverlayUniforms:{uColor:{value:new Float32Array(3),type:`vec3<f32>`},uAlpha:{value:n.alpha,type:`f32`}}}}),or(this,`uniforms`),or(this,`_color`),this.uniforms=this.resources.colorOverlayUniforms.uniforms,this._color=new g,this.color=n.color??0}get color(){return this._color.value}set color(e){this._color.setValue(e);let[t,n,r]=this._color.toArray();this.uniforms.uColor[0]=t,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(e){this.uniforms.uAlpha=e}};or(sr,`DEFAULT_OPTIONS`,{color:0,alpha:1});var cr=sr,lr=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform mat3 uMatrix;

void main(void)
{
    vec4 c11 = texture(uTexture, vTextureCoord - uTexelSize); // top left
    vec4 c12 = texture(uTexture, vec2(vTextureCoord.x, vTextureCoord.y - uTexelSize.y)); // top center
    vec4 c13 = texture(uTexture, vec2(vTextureCoord.x + uTexelSize.x, vTextureCoord.y - uTexelSize.y)); // top right

    vec4 c21 = texture(uTexture, vec2(vTextureCoord.x - uTexelSize.x, vTextureCoord.y)); // mid left
    vec4 c22 = texture(uTexture, vTextureCoord); // mid center
    vec4 c23 = texture(uTexture, vec2(vTextureCoord.x + uTexelSize.x, vTextureCoord.y)); // mid right

    vec4 c31 = texture(uTexture, vec2(vTextureCoord.x - uTexelSize.x, vTextureCoord.y + uTexelSize.y)); // bottom left
    vec4 c32 = texture(uTexture, vec2(vTextureCoord.x, vTextureCoord.y + uTexelSize.y)); // bottom center
    vec4 c33 = texture(uTexture, vTextureCoord + uTexelSize); // bottom right

    finalColor =
        c11 * uMatrix[0][0] + c12 * uMatrix[0][1] + c13 * uMatrix[0][2] +
        c21 * uMatrix[1][0] + c22 * uMatrix[1][1] + c23 * uMatrix[1][2] +
        c31 * uMatrix[2][0] + c32 * uMatrix[2][1] + c33 * uMatrix[2][2];

    finalColor.a = c22.a;
}`,ur=`struct ConvolutionUniforms {
    uMatrix: mat3x3<f32>,
    uTexelSize: vec2<f32>,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> convolutionUniforms : ConvolutionUniforms;

@fragment
fn mainFragment(
    @location(0) uv: vec2<f32>,
    @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let texelSize = convolutionUniforms.uTexelSize;
    let matrix = convolutionUniforms.uMatrix;

    let c11: vec4<f32> = textureSample(uTexture, uSampler, uv - texelSize); // top left
    let c12: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x, uv.y - texelSize.y)); // top center
    let c13: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x + texelSize.x, uv.y - texelSize.y)); // top right

    let c21: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x - texelSize.x, uv.y)); // mid left
    let c22: vec4<f32> = textureSample(uTexture, uSampler, uv); // mid center
    let c23: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x + texelSize.x, uv.y)); // mid right

    let c31: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x - texelSize.x, uv.y + texelSize.y)); // bottom left
    let c32: vec4<f32> = textureSample(uTexture, uSampler, vec2<f32>(uv.x, uv.y + texelSize.y)); // bottom center
    let c33: vec4<f32> = textureSample(uTexture, uSampler, uv + texelSize); // bottom right

    var finalColor: vec4<f32> = vec4<f32>(
        c11 * matrix[0][0] + c12 * matrix[0][1] + c13 * matrix[0][2] +
        c21 * matrix[1][0] + c22 * matrix[1][1] + c23 * matrix[1][2] +
        c31 * matrix[2][0] + c32 * matrix[2][1] + c33 * matrix[2][2]
    );

    finalColor.a = c22.a;

    return finalColor;
}`,dr=Object.defineProperty,fr=(e,t,n)=>t in e?dr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,pr=(e,t,n)=>(fr(e,typeof t==`symbol`?t:t+``,n),n),mr=class e extends b{constructor(...t){let n=t[0]??{};Array.isArray(n)&&(u(`6.0.0`,`ConvolutionFilter constructor params are now options object. See params: { matrix, width, height }`),n={matrix:n},t[1]!==void 0&&(n.width=t[1]),t[2]!==void 0&&(n.height=t[2])),n={...e.DEFAULT_OPTIONS,...n};let r=n.width??200,i=n.height??200,a=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:ur,entryPoint:`mainFragment`}}),o=_.from({vertex:j,fragment:lr,name:`convolution-filter`});super({gpuProgram:a,glProgram:o,resources:{convolutionUniforms:{uMatrix:{value:n.matrix,type:`mat3x3<f32>`},uTexelSize:{value:{x:1/r,y:1/i},type:`vec2<f32>`}}}}),pr(this,`uniforms`),this.uniforms=this.resources.convolutionUniforms.uniforms,this.width=r,this.height=i}get matrix(){return this.uniforms.uMatrix}set matrix(e){e.forEach((e,t)=>{this.uniforms.uMatrix[t]=e})}get width(){return 1/this.uniforms.uTexelSize.x}set width(e){this.uniforms.uTexelSize.x=1/e}get height(){return 1/this.uniforms.uTexelSize.y}set height(e){this.uniforms.uTexelSize.y=1/e}};pr(mr,`DEFAULT_OPTIONS`,{matrix:new Float32Array(9),width:200,height:200});var hr=mr,gr=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;

void main(void)
{
    float lum = length(texture(uTexture, vTextureCoord.xy).rgb);

    finalColor = vec4(1.0, 1.0, 1.0, 1.0);

    if (lum < 1.00)
    {
        if (mod(gl_FragCoord.x + gl_FragCoord.y, 10.0) == 0.0)
        {
            finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }

    if (lum < 0.75)
    {
        if (mod(gl_FragCoord.x - gl_FragCoord.y, 10.0) == 0.0)
        {
            finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }

    if (lum < 0.50)
    {
        if (mod(gl_FragCoord.x + gl_FragCoord.y - 5.0, 10.0) == 0.0)
        {
            finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }

    if (lum < 0.3)
    {
        if (mod(gl_FragCoord.x - gl_FragCoord.y - 5.0, 10.0) == 0.0)
        {
            finalColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
}
`,_r=`@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;

@fragment
fn mainFragment(
    @location(0) uv: vec2<f32>,
    @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let lum: f32 = length(textureSample(uTexture, uSampler, uv).rgb);

    if (lum < 1.00)
    {
        if (modulo(position.x + position.y, 10.0) == 0.0)
        {
            return vec4<f32>(0.0, 0.0, 0.0, 1.0);
        }
    }

    if (lum < 0.75)
    {
        if (modulo(position.x - position.y, 10.0) == 0.0)
        {
            return vec4<f32>(0.0, 0.0, 0.0, 1.0);
        }
    }

    if (lum < 0.50)
    {
        if (modulo(position.x + position.y - 5.0, 10.0) == 0.0)
        {
            return vec4<f32>(0.0, 0.0, 0.0, 1.0);
        }
    }

    if (lum < 0.3)
    {
        if (modulo(position.x - position.y - 5.0, 10.0) == 0.0)
        {
            return vec4<f32>(0.0, 0.0, 0.0, 1.0);
        }
    }

    return vec4<f32>(1.0);
}

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}`,vr=class extends b{constructor(){let e=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:_r,entryPoint:`mainFragment`}}),t=_.from({vertex:j,fragment:gr,name:`cross-hatch-filter`});super({gpuProgram:e,glProgram:t,resources:{}})}},yr=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uLine;
uniform vec2 uNoise;
uniform vec3 uVignette;
uniform float uSeed;
uniform float uTime;
uniform vec2 uDimensions;

uniform vec4 uInputSize;

const float SQRT_2 = 1.414213;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float vignette(vec3 co, vec2 coord)
{
    float outter = SQRT_2 - uVignette[0] * SQRT_2;
    vec2 dir = vec2(0.5) - coord;
    dir.y *= uDimensions.y / uDimensions.x;
    float darker = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignette[2] * SQRT_2), 0.0, 1.0);
    return darker + (1.0 - darker) * (1.0 - uVignette[1]);
}

float noise(vec2 coord)
{
    vec2 pixelCoord = coord * uInputSize.xy;
    pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
    pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
    return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}

vec3 interlaceLines(vec3 co, vec2 coord)
{
    vec3 color = co;

    float curvature = uLine[0];
    float lineWidth = uLine[1];
    float lineContrast = uLine[2];
    float verticalLine = uLine[3];

    vec2 dir = vec2(coord * uInputSize.xy / uDimensions - 0.5);

    float _c = curvature > 0. ? curvature : 1.;
    float k = curvature > 0. ? (length(dir * dir) * 0.25 * _c * _c + 0.935 * _c) : 1.;
    vec2 uv = dir * k;
    float v = verticalLine > 0.5 ? uv.x * uDimensions.x : uv.y * uDimensions.y;
    v *= min(1.0, 2.0 / lineWidth ) / _c;
    float j = 1. + cos(v * 1.2 - uTime) * 0.5 * lineContrast;
    color *= j;

    float segment = verticalLine > 0.5 ? mod((dir.x + .5) * uDimensions.x, 4.) : mod((dir.y + .5) * uDimensions.y, 4.);
    color *= 0.99 + ceil(segment) * 0.015;

    return color;
}

void main(void)
{
    finalColor = texture(uTexture, vTextureCoord);
    vec2 coord = vTextureCoord * uInputSize.xy / uDimensions;

    if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
    {
        float n = noise(vTextureCoord);
        finalColor += vec4(n, n, n, finalColor.a);
    }

    if (uVignette[0] > 0.)
    {
        float v = vignette(finalColor.rgb, coord);
        finalColor *= vec4(v, v, v, finalColor.a);
    }

    if (uLine[1] > 0.0)
    {
        finalColor = vec4(interlaceLines(finalColor.rgb, vTextureCoord), finalColor.a);  
    }
}
`,br=`struct CRTUniforms {
    uLine: vec4<f32>,
    uNoise: vec2<f32>,
    uVignette: vec3<f32>,
    uSeed: f32,
    uTime: f32,
    uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> crtUniforms : CRTUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let coord: vec2<f32> = uv * gfu.uInputSize.xy / crtUniforms.uDimensions;

  let uNoise = crtUniforms.uNoise;

  if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
  {
    color += vec4<f32>(vec3<f32>(noise(uv)), color.a);
  }

  if (crtUniforms.uVignette[0] > 0.)
  {
    color *= vec4<f32>(vec3<f32>(vignette(color.rgb, coord)), color.a);
  }

  if (crtUniforms.uLine[1] > 0.0)
  {
    color = vec4<f32>(vec3<f32>(interlaceLines(color.rgb, uv)), color.a);  
  }

  return color;
}

const SQRT_2: f32 = 1.414213;

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>) -> f32
{
  return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn vignette(co: vec3<f32>, coord: vec2<f32>) -> f32
{
  let uVignette = crtUniforms.uVignette;
  let uDimensions = crtUniforms.uDimensions;
  
  let outter: f32 = SQRT_2 - uVignette[0] * SQRT_2;
  var dir: vec2<f32> = vec2<f32>(0.5) - coord;
  dir.y *= uDimensions.y / uDimensions.x;
  let darker: f32 = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignette[2] * SQRT_2), 0.0, 1.0);
  return darker + (1.0 - darker) * (1.0 - uVignette[1]);
}

fn noise(coord: vec2<f32>) -> f32
{
  let uNoise = crtUniforms.uNoise;
  let uSeed = crtUniforms.uSeed;

  var pixelCoord: vec2<f32> = coord * gfu.uInputSize.xy;
  pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
  pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
  return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}

fn interlaceLines(co: vec3<f32>, coord: vec2<f32>) -> vec3<f32>
{
  var color = co;

  let uDimensions = crtUniforms.uDimensions;

  let curvature: f32 = crtUniforms.uLine[0];
  let lineWidth: f32 = crtUniforms.uLine[1];
  let lineContrast: f32 = crtUniforms.uLine[2];
  let verticalLine: f32 = crtUniforms.uLine[3];

  let dir: vec2<f32> = vec2<f32>(coord * gfu.uInputSize.xy / uDimensions - 0.5);

  let _c: f32 = select(1., curvature, curvature > 0.);
  let k: f32 = select(1., (length(dir * dir) * 0.25 * _c * _c + 0.935 * _c), curvature > 0.);
  let uv: vec2<f32> = dir * k;
  let v: f32 = select(uv.y * uDimensions.y, uv.x * uDimensions.x, verticalLine > 0.5) * min(1.0, 2.0 / lineWidth ) / _c;
  let j: f32 = 1. + cos(v * 1.2 - crtUniforms.uTime) * 0.5 * lineContrast;
  color *= j;

  let segment: f32 = select(modulo((dir.y + .5) * uDimensions.y, 4.), modulo((dir.x + .5) * uDimensions.x, 4.), verticalLine > 0.5);
  color *= 0.99 + ceil(segment) * 0.015;

  return color;
}`,xr=Object.defineProperty,Sr=(e,t,n)=>t in e?xr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Cr=(e,t,n)=>(Sr(e,typeof t==`symbol`?t:t+``,n),n),wr=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:br,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:yr,name:`crt-filter`});super({gpuProgram:n,glProgram:r,resources:{crtUniforms:{uLine:{value:new Float32Array(4),type:`vec4<f32>`},uNoise:{value:new Float32Array(2),type:`vec2<f32>`},uVignette:{value:new Float32Array(3),type:`vec3<f32>`},uSeed:{value:t.seed,type:`f32`},uTime:{value:t.time,type:`f32`},uDimensions:{value:new Float32Array(2),type:`vec2<f32>`}}}}),Cr(this,`uniforms`),Cr(this,`seed`),Cr(this,`time`),this.uniforms=this.resources.crtUniforms.uniforms,Object.assign(this,t)}apply(e,t,n,r){this.uniforms.uDimensions[0]=t.frame.width,this.uniforms.uDimensions[1]=t.frame.height,this.uniforms.uSeed=this.seed,this.uniforms.uTime=this.time,e.applyFilter(this,t,n,r)}get curvature(){return this.uniforms.uLine[0]}set curvature(e){this.uniforms.uLine[0]=e}get lineWidth(){return this.uniforms.uLine[1]}set lineWidth(e){this.uniforms.uLine[1]=e}get lineContrast(){return this.uniforms.uLine[2]}set lineContrast(e){this.uniforms.uLine[2]=e}get verticalLine(){return this.uniforms.uLine[3]>.5}set verticalLine(e){this.uniforms.uLine[3]=+!!e}get noise(){return this.uniforms.uNoise[0]}set noise(e){this.uniforms.uNoise[0]=e}get noiseSize(){return this.uniforms.uNoise[1]}set noiseSize(e){this.uniforms.uNoise[1]=e}get vignetting(){return this.uniforms.uVignette[0]}set vignetting(e){this.uniforms.uVignette[0]=e}get vignettingAlpha(){return this.uniforms.uVignette[1]}set vignettingAlpha(e){this.uniforms.uVignette[1]=e}get vignettingBlur(){return this.uniforms.uVignette[2]}set vignettingBlur(e){this.uniforms.uVignette[2]=e}};Cr(wr,`DEFAULT_OPTIONS`,{curvature:1,lineWidth:1,lineContrast:.25,verticalLine:!1,noise:0,noiseSize:1,vignetting:.3,vignettingAlpha:1,vignettingBlur:.3,time:0,seed:0});var Tr=wr,Er=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uAngle;
uniform float uScale;
uniform bool uGrayScale;

uniform vec4 uInputSize;

float pattern()
{
    float s = sin(uAngle), c = cos(uAngle);
    vec2 tex = vTextureCoord * uInputSize.xy;
    vec2 point = vec2(
        c * tex.x - s * tex.y,
        s * tex.x + c * tex.y
    ) * uScale;
    return (sin(point.x) * sin(point.y)) * 4.0;
    }

    void main()
    {
    vec4 color = texture(uTexture, vTextureCoord);
    vec3 colorRGB = vec3(color);

    if (uGrayScale)
    {
        colorRGB = vec3(color.r + color.g + color.b) / 3.0;
    }

    finalColor = vec4(colorRGB * 10.0 - 5.0 + pattern(), color.a);
}
`,Dr=`struct DotUniforms {
  uScale:f32,
  uAngle:f32,
  uGrayScale:f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> dotUniforms : DotUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
  let color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let gray: vec3<f32> = vec3<f32>(dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114)));
  // dotUniforms.uGrayScale == 1 doesn't ever pass so it is converted to a float and compared to 0.5 instead 
  let finalColor: vec3<f32> = select(color.rgb, gray, f32(dotUniforms.uGrayScale) >= 0.5);

  return vec4<f32>(finalColor * 10.0 - 5.0 + pattern(uv), color.a);
}

fn pattern(uv: vec2<f32>) -> f32
{
  let s: f32 = sin(dotUniforms.uAngle);
  let c: f32 = cos(dotUniforms.uAngle);
  
  let tex: vec2<f32> = uv * gfu.uInputSize.xy;
  
  let p: vec2<f32> = vec2<f32>(
      c * tex.x - s * tex.y,
      s * tex.x + c * tex.y
  ) * dotUniforms.uScale;

  return (sin(p.x) * sin(p.y)) * 4.0;
}`,Or=Object.defineProperty,kr=(e,t,n)=>t in e?Or(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Ar=(e,t,n)=>(kr(e,typeof t==`symbol`?t:t+``,n),n),jr=class e extends b{constructor(...t){let n=t[0]??{};typeof n==`number`&&(u(`6.0.0`,`DotFilter constructor params are now options object. See params: { scale, angle, grayscale }`),n={scale:n},t[1]!==void 0&&(n.angle=t[1]),t[2]!==void 0&&(n.grayscale=t[2])),n={...e.DEFAULT_OPTIONS,...n};let r={uScale:{value:n.scale,type:`f32`},uAngle:{value:n.angle,type:`f32`},uGrayScale:{value:+!!n.grayscale,type:`f32`}},i=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Dr,entryPoint:`mainFragment`}}),a=_.from({vertex:j,fragment:Er,name:`dot-filter`});super({gpuProgram:i,glProgram:a,resources:{dotUniforms:r}})}get scale(){return this.resources.dotUniforms.uniforms.uScale}set scale(e){this.resources.dotUniforms.uniforms.uScale=e}get angle(){return this.resources.dotUniforms.uniforms.uAngle}set angle(e){this.resources.dotUniforms.uniforms.uAngle=e}get grayscale(){return this.resources.dotUniforms.uniforms.uGrayScale===1}set grayscale(e){this.resources.dotUniforms.uniforms.uGrayScale=+!!e}};Ar(jr,`DEFAULT_OPTIONS`,{scale:1,angle:5,grayscale:!0});var Mr=jr,Nr=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uAlpha;
uniform vec3 uColor;
uniform vec2 uOffset;

uniform vec4 uInputSize;

void main(void){
    vec4 sample = texture(uTexture, vTextureCoord - uOffset * uInputSize.zw);

    // Premultiply alpha
    sample.rgb = uColor.rgb * sample.a;

    // alpha user alpha
    sample *= uAlpha;

    finalColor = sample;
}`,Pr=`struct DropShadowUniforms {
  uAlpha: f32,
  uColor: vec3<f32>,
  uOffset: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> dropShadowUniforms : DropShadowUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv - dropShadowUniforms.uOffset * gfu.uInputSize.zw);

  // Premultiply alpha
  color = vec4<f32>(vec3<f32>(dropShadowUniforms.uColor.rgb * color.a), color.a);
  // alpha user alpha
  color *= dropShadowUniforms.uAlpha;

  return color;
}`,Fr=Object.defineProperty,Ir=(e,t,n)=>t in e?Fr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,R=(e,t,n)=>(Ir(e,typeof t==`symbol`?t:t+``,n),n),Lr=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Pr,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:Nr,name:`drop-shadow-filter`});super({gpuProgram:n,glProgram:r,resources:{dropShadowUniforms:{uAlpha:{value:t.alpha,type:`f32`},uColor:{value:new Float32Array(3),type:`vec3<f32>`},uOffset:{value:t.offset,type:`vec2<f32>`}}},resolution:t.resolution}),R(this,`uniforms`),R(this,`shadowOnly`,!1),R(this,`_color`),R(this,`_blurFilter`),R(this,`_basePass`),this.uniforms=this.resources.dropShadowUniforms.uniforms,this._color=new g,this.color=t.color??0,this._blurFilter=new un({strength:t.kernels??t.blur,quality:t.kernels?void 0:t.quality}),this._basePass=new b({gpuProgram:S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:`
                    @group(0) @binding(1) var uTexture: texture_2d<f32>; 
                    @group(0) @binding(2) var uSampler: sampler;
                    @fragment
                    fn mainFragment(
                        @builtin(position) position: vec4<f32>,
                        @location(0) uv : vec2<f32>
                    ) -> @location(0) vec4<f32> {
                        return textureSample(uTexture, uSampler, uv);
                    }
                    `,entryPoint:`mainFragment`}}),glProgram:_.from({vertex:j,fragment:`
                in vec2 vTextureCoord;
                out vec4 finalColor;
                uniform sampler2D uTexture;

                void main(void){
                    finalColor = texture(uTexture, vTextureCoord);
                }
                `,name:`drop-shadow-filter`}),resources:{}}),Object.assign(this,t)}apply(e,t,n,r){let i=y.getSameSizeTexture(t);e.applyFilter(this,t,i,!0),this._blurFilter.apply(e,i,n,r),this.shadowOnly||e.applyFilter(this._basePass,t,n,!1),y.returnTexture(i)}get offset(){return this.uniforms.uOffset}set offset(e){this.uniforms.uOffset=e,this._updatePadding()}get offsetX(){return this.offset.x}set offsetX(e){this.offset.x=e,this._updatePadding()}get offsetY(){return this.offset.y}set offsetY(e){this.offset.y=e,this._updatePadding()}get color(){return this._color.value}set color(e){this._color.setValue(e);let[t,n,r]=this._color.toArray();this.uniforms.uColor[0]=t,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(e){this.uniforms.uAlpha=e}get blur(){return this._blurFilter.strength}set blur(e){this._blurFilter.strength=e,this._updatePadding()}get quality(){return this._blurFilter.quality}set quality(e){this._blurFilter.quality=e,this._updatePadding()}get kernels(){return this._blurFilter.kernels}set kernels(e){this._blurFilter.kernels=e}get pixelSize(){return this._blurFilter.pixelSize}set pixelSize(e){typeof e==`number`&&(e={x:e,y:e}),Array.isArray(e)&&(e={x:e[0],y:e[1]}),this._blurFilter.pixelSize=e}get pixelSizeX(){return this._blurFilter.pixelSizeX}set pixelSizeX(e){this._blurFilter.pixelSizeX=e}get pixelSizeY(){return this._blurFilter.pixelSizeY}set pixelSizeY(e){this._blurFilter.pixelSizeY=e}_updatePadding(){let e=Math.max(Math.abs(this.offsetX),Math.abs(this.offsetY));this.padding=e+this.blur*2+this.quality*4}};R(Lr,`DEFAULT_OPTIONS`,{offset:{x:4,y:4},color:0,alpha:.5,shadowOnly:!1,kernels:void 0,blur:2,quality:3,pixelSize:{x:1,y:1},resolution:1});var Rr=Lr,zr=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uStrength;

uniform vec4 uInputSize;

void main(void)
{
	vec2 onePixel = vec2(1.0 / uInputSize);

	vec4 color;

	color.rgb = vec3(0.5);

	color -= texture(uTexture, vTextureCoord - onePixel) * uStrength;
	color += texture(uTexture, vTextureCoord + onePixel) * uStrength;

	color.rgb = vec3((color.r + color.g + color.b) / 3.0);

	float alpha = texture(uTexture, vTextureCoord).a;

	finalColor = vec4(color.rgb * alpha, alpha);
}
`,Br=`struct EmbossUniforms {
  uStrength:f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> embossUniforms : EmbossUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let onePixel: vec2<f32> = vec2<f32>(1.0 / gfu.uInputSize.xy);
	var color: vec3<f32> = vec3<f32>(0.5);

	color -= (textureSample(uTexture, uSampler, uv - onePixel) * embossUniforms.uStrength).rgb;
	color += (textureSample(uTexture, uSampler, uv + onePixel) * embossUniforms.uStrength).rgb;

	color = vec3<f32>((color.r + color.g + color.b) / 3.0);

	let blendColor: vec4<f32> = textureSample(uTexture, uSampler, uv);

	return vec4<f32>(color.rgb * blendColor.a, blendColor.a);
}`,Vr=Object.defineProperty,Hr=(e,t,n)=>t in e?Vr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Ur=(e,t,n)=>(Hr(e,typeof t==`symbol`?t:t+``,n),n),Wr=class extends b{constructor(e=5){let t=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Br,entryPoint:`mainFragment`}}),n=_.from({vertex:j,fragment:zr,name:`emboss-filter`});super({gpuProgram:t,glProgram:n,resources:{embossUniforms:{uStrength:{value:e,type:`f32`}}}}),Ur(this,`uniforms`),this.uniforms=this.resources.embossUniforms.uniforms}get strength(){return this.uniforms.uStrength}set strength(e){this.uniforms.uStrength=e}},Gr=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uDisplacementMap;
uniform float uSeed;
uniform vec2 uDimensions;
uniform float uAspect;
uniform float uFillMode;
uniform float uOffset;
uniform float uDirection;
uniform vec2 uRed;
uniform vec2 uGreen;
uniform vec2 uBlue;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

const int TRANSPARENT = 0;
const int ORIGINAL = 1;
const int LOOP = 2;
const int CLAMP = 3;
const int MIRROR = 4;

void main(void)
{
    vec2 coord = (vTextureCoord * uInputSize.xy) / uDimensions;

    if (coord.x > 1.0 || coord.y > 1.0) {
        return;
    }

    float sinDir = sin(uDirection);
    float cosDir = cos(uDirection);

    float cx = coord.x - 0.5;
    float cy = (coord.y - 0.5) * uAspect;
    float ny = (-sinDir * cx + cosDir * cy) / uAspect + 0.5;

    // displacementMap: repeat
    // ny = ny > 1.0 ? ny - 1.0 : (ny < 0.0 ? 1.0 + ny : ny);

    // displacementMap: mirror
    ny = ny > 1.0 ? 2.0 - ny : (ny < 0.0 ? -ny : ny);

    vec4 dc = texture(uDisplacementMap, vec2(0.5, ny));

    float displacement = (dc.r - dc.g) * (uOffset / uInputSize.x);

    coord = vTextureCoord + vec2(cosDir * displacement, sinDir * displacement * uAspect);

    int fillMode = int(uFillMode);

    if (fillMode == CLAMP) {
        coord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    } else {
        if( coord.x > uInputClamp.z ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.x -= uInputClamp.z;
            } else if (fillMode == MIRROR) {
                coord.x = uInputClamp.z * 2.0 - coord.x;
            }
        } else if( coord.x < uInputClamp.x ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.x += uInputClamp.z;
            } else if (fillMode == MIRROR) {
                coord.x *= -uInputClamp.z;
            }
        }

        if( coord.y > uInputClamp.w ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.y -= uInputClamp.w;
            } else if (fillMode == MIRROR) {
                coord.y = uInputClamp.w * 2.0 - coord.y;
            }
        } else if( coord.y < uInputClamp.y ) {
            if (fillMode == TRANSPARENT) {
                discard;
            } else if (fillMode == LOOP) {
                coord.y += uInputClamp.w;
            } else if (fillMode == MIRROR) {
                coord.y *= -uInputClamp.w;
            }
        }
    }

    finalColor.r = texture(uTexture, coord + uRed * (1.0 - uSeed * 0.4) / uInputSize.xy).r;
    finalColor.g = texture(uTexture, coord + uGreen * (1.0 - uSeed * 0.3) / uInputSize.xy).g;
    finalColor.b = texture(uTexture, coord + uBlue * (1.0 - uSeed * 0.2) / uInputSize.xy).b;
    finalColor.a = texture(uTexture, coord).a;
}
`,Kr=`struct GlitchUniforms {
  uSeed: f32,
  uDimensions: vec2<f32>,
  uAspect: f32,
  uFillMode: f32,
  uOffset: f32,
  uDirection: f32,
  uRed: vec2<f32>,
  uGreen: vec2<f32>,
  uBlue: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> glitchUniforms : GlitchUniforms;
@group(1) @binding(1) var uDisplacementMap: texture_2d<f32>; 
@group(1) @binding(2) var uDisplacementSampler: sampler; 

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uSeed: f32 = glitchUniforms.uSeed;
  let uDimensions: vec2<f32> = glitchUniforms.uDimensions;
  let uAspect: f32 = glitchUniforms.uAspect;
  let uOffset: f32 = glitchUniforms.uOffset;
  let uDirection: f32 = glitchUniforms.uDirection;
  let uRed: vec2<f32> = glitchUniforms.uRed;
  let uGreen: vec2<f32> = glitchUniforms.uGreen;
  let uBlue: vec2<f32> = glitchUniforms.uBlue;

  let uInputSize: vec4<f32> = gfu.uInputSize;
  let uInputClamp: vec4<f32> = gfu.uInputClamp;

  var discarded: bool = false;
  var coord: vec2<f32> = (uv * uInputSize.xy) / uDimensions;

    if (coord.x > 1.0 || coord.y > 1.0) {
      discarded = true;
    }

    let sinDir: f32 = sin(uDirection);
    let cosDir: f32 = cos(uDirection);

    let cx: f32 = coord.x - 0.5;
    let cy: f32 = (coord.y - 0.5) * uAspect;
    var ny: f32 = (-sinDir * cx + cosDir * cy) / uAspect + 0.5;

    ny = select(select(ny, -ny, ny < 0.0), 2.0 - ny, ny > 1.0);

    let dc: vec4<f32> = textureSample(uDisplacementMap, uDisplacementSampler, vec2<f32>(0.5, ny));

    let displacement: f32 = (dc.r - dc.g) * (uOffset / uInputSize.x);

    coord = uv + vec2<f32>(cosDir * displacement, sinDir * displacement * uAspect);

    let fillMode: i32 = i32(glitchUniforms.uFillMode);

    if (fillMode == CLAMP) {
      coord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    } else {
      if (coord.x > uInputClamp.z) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.x = coord.x - uInputClamp.z;
        } else if (fillMode == MIRROR) {
          coord.x = uInputClamp.z * 2.0 - coord.x;
        }
      } else if (coord.x < uInputClamp.x) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.x = coord.x + uInputClamp.z;
        } else if (fillMode == MIRROR) {
          coord.x = coord.x * -uInputClamp.z;
        }
      }

      if (coord.y > uInputClamp.w) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.y = coord.y - uInputClamp.w;
        } else if (fillMode == MIRROR) {
          coord.y = uInputClamp.w * 2.0 - coord.y;
        }
      } else if (coord.y < uInputClamp.y) {
        if (fillMode == TRANSPARENT) {
          discarded = true;
        } else if (fillMode == LOOP) {
          coord.y = coord.y + uInputClamp.w;
        } else if (fillMode == MIRROR) {
          coord.y = coord.y * -uInputClamp.w;
        }
      }
    }

    let seedR: f32 = 1.0 - uSeed * 0.4;
    let seedG: f32 = 1.0 - uSeed * 0.3;
    let seedB: f32 = 1.0 - uSeed * 0.2;

    let offsetR: vec2<f32> = vec2(uRed.x * seedR / uInputSize.x, uRed.y * seedR / uInputSize.y);
    let offsetG: vec2<f32> = vec2(uGreen.x * seedG / uInputSize.x, uGreen.y * seedG / uInputSize.y);
    let offsetB: vec2<f32> = vec2(uBlue.x * seedB / uInputSize.x, uBlue.y * seedB / uInputSize.y);

    let r = textureSample(uTexture, uSampler, coord + offsetR).r;
    let g = textureSample(uTexture, uSampler, coord + offsetG).g;
    let b = textureSample(uTexture, uSampler, coord + offsetB).b;
    let a = textureSample(uTexture, uSampler, coord).a;

    return select(vec4<f32>(r, g, b, a), vec4<f32>(0.0,0.0,0.0,0.0), discarded);
}

const TRANSPARENT: i32 = 0;
const ORIGINAL: i32 = 1;
const LOOP: i32 = 2;
const CLAMP: i32 = 3;
const MIRROR: i32 = 4;`,qr=Object.defineProperty,Jr=(e,t,n)=>t in e?qr(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,z=(e,t,n)=>(Jr(e,typeof t==`symbol`?t:t+``,n),n),Yr=class e extends b{constructor(t){t={...e.defaults,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Kr,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:Gr,name:`glitch-filter`}),i=document.createElement(`canvas`);i.width=4,i.height=t.sampleSize??512;let a=new f({source:new E({resource:i})});super({gpuProgram:n,glProgram:r,resources:{glitchUniforms:{uSeed:{value:t?.seed??0,type:`f32`},uDimensions:{value:new Float32Array(2),type:`vec2<f32>`},uAspect:{value:1,type:`f32`},uFillMode:{value:t?.fillMode??0,type:`f32`},uOffset:{value:t?.offset??100,type:`f32`},uDirection:{value:t?.direction??0,type:`f32`},uRed:{value:{x:0,y:0},type:`vec2<f32>`},uGreen:{value:{x:0,y:0},type:`vec2<f32>`},uBlue:{value:{x:0,y:0},type:`vec2<f32>`}},uDisplacementMap:a.source,uDisplacementSampler:a.source.style}}),z(this,`uniforms`),z(this,`average`,!1),z(this,`minSize`,8),z(this,`sampleSize`,512),z(this,`_canvas`),z(this,`texture`),z(this,`_slices`,0),z(this,`_sizes`,new Float32Array(1)),z(this,`_offsets`,new Float32Array(1)),this.uniforms=this.resources.glitchUniforms.uniforms,this._canvas=i,this.texture=a,Object.assign(this,t)}apply(e,t,n,r){let{width:i,height:a}=t.frame;this.uniforms.uDimensions[0]=i,this.uniforms.uDimensions[1]=a,this.uniforms.uAspect=a/i,e.applyFilter(this,t,n,r)}_randomizeSizes(){let e=this._sizes,t=this._slices-1,n=this.sampleSize,r=Math.min(this.minSize/n,.9/this._slices);if(this.average){let n=this._slices,i=1;for(let a=0;a<t;a++){let t=i/(n-a),o=Math.max(t*(1-Math.random()*.6),r);e[a]=o,i-=o}e[t]=i}else{let n=1,i=Math.sqrt(1/this._slices);for(let a=0;a<t;a++){let t=Math.max(i*n*Math.random(),r);e[a]=t,n-=t}e[t]=n}this.shuffle()}shuffle(){let e=this._sizes,t=this._slices-1;for(let n=t;n>0;n--){let t=Math.random()*n|0,r=e[n];e[n]=e[t],e[t]=r}}_randomizeOffsets(){for(let e=0;e<this._slices;e++)this._offsets[e]=Math.random()*(Math.random()<.5?-1:1)}refresh(){this._randomizeSizes(),this._randomizeOffsets(),this.redraw()}redraw(){let e=this.sampleSize,t=this.texture,n=this._canvas.getContext(`2d`);n.clearRect(0,0,8,e);let r,i=0;for(let t=0;t<this._slices;t++){r=Math.floor(this._offsets[t]*256);let a=this._sizes[t]*e;n.fillStyle=`rgba(${r>0?r:0}, ${r<0?-r:0}, 0, 1)`,n.fillRect(0,i|0,e,a+1|0),i+=a}t.source.update()}set sizes(e){let t=Math.min(this._slices,e.length);for(let n=0;n<t;n++)this._sizes[n]=e[n]}get sizes(){return this._sizes}set offsets(e){let t=Math.min(this._slices,e.length);for(let n=0;n<t;n++)this._offsets[n]=e[n]}get offsets(){return this._offsets}get slices(){return this._slices}set slices(e){this._slices!==e&&(this._slices=e,this._sizes=new Float32Array(e),this._offsets=new Float32Array(e),this.refresh())}get offset(){return this.uniforms.uOffset}set offset(e){this.uniforms.uOffset=e}get seed(){return this.uniforms.uSeed}set seed(e){this.uniforms.uSeed=e}get fillMode(){return this.uniforms.uFillMode}set fillMode(e){this.uniforms.uFillMode=e}get direction(){return this.uniforms.uDirection/l}set direction(e){this.uniforms.uDirection=e*l}get red(){return this.uniforms.uRed}set red(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uRed=e}get green(){return this.uniforms.uGreen}set green(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uGreen=e}get blue(){return this.uniforms.uBlue}set blue(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uBlue=e}destroy(){this.texture?.destroy(!0),this.texture=this._canvas=this.red=this.green=this.blue=this._sizes=this._offsets=null}};z(Yr,`defaults`,{slices:5,offset:100,direction:0,fillMode:0,average:!1,seed:0,red:{x:0,y:0},green:{x:0,y:0},blue:{x:0,y:0},minSize:8,sampleSize:512});var Xr=Yr,Zr=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uStrength;
uniform vec3 uColor;
uniform float uKnockout;
uniform float uAlpha;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

const float PI = 3.14159265358979323846264;

// Hard-assignment of DIST and ANGLE_STEP_SIZE instead of using uDistance and uQuality to allow them to be use on GLSL loop conditions
const float DIST = __DIST__;
const float ANGLE_STEP_SIZE = min(__ANGLE_STEP_SIZE__, PI * 2.);
const float ANGLE_STEP_NUM = ceil(PI * 2. / ANGLE_STEP_SIZE);
const float MAX_TOTAL_ALPHA = ANGLE_STEP_NUM * DIST * (DIST + 1.) / 2.;

void main(void) {
    vec2 px = vec2(1.) / uInputSize.xy;

    float totalAlpha = 0.;

    vec2 direction;
    vec2 displaced;
    vec4 curColor;

    for (float angle = 0.; angle < PI * 2.; angle += ANGLE_STEP_SIZE) {
      direction = vec2(cos(angle), sin(angle)) * px;

      for (float curDistance = 0.; curDistance < DIST; curDistance++) {
          displaced = clamp(vTextureCoord + direction * (curDistance + 1.), uInputClamp.xy, uInputClamp.zw);
          curColor = texture(uTexture, displaced);
          totalAlpha += (DIST - curDistance) * curColor.a;
      }
    }
    
    curColor = texture(uTexture, vTextureCoord);

    vec4 glowColor = vec4(uColor, uAlpha);
    bool knockout = uKnockout > .5;
    float innerStrength = uStrength[0];
    float outerStrength = uStrength[1];

    float alphaRatio = totalAlpha / MAX_TOTAL_ALPHA;
    float innerGlowAlpha = (1. - alphaRatio) * innerStrength * curColor.a * uAlpha;
    float innerGlowStrength = min(1., innerGlowAlpha);
    
    vec4 innerColor = mix(curColor, glowColor, innerGlowStrength);
    float outerGlowAlpha = alphaRatio * outerStrength * (1. - curColor.a) * uAlpha;
    float outerGlowStrength = min(1. - innerColor.a, outerGlowAlpha);
    vec4 outerGlowColor = outerGlowStrength * glowColor.rgba;

    if (knockout) {
      float resultAlpha = outerGlowAlpha + innerGlowAlpha;
      finalColor = vec4(glowColor.rgb * resultAlpha, resultAlpha);
    }
    else {
      finalColor = innerColor + outerGlowColor;
    }
}
`,Qr=`struct GlowUniforms {
  uDistance: f32,
  uStrength: vec2<f32>,
  uColor: vec3<f32>,
  uAlpha: f32,
  uQuality: f32,
  uKnockout: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> glowUniforms : GlowUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let quality = glowUniforms.uQuality;
  let distance = glowUniforms.uDistance;

  let dist: f32 = glowUniforms.uDistance;
  let angleStepSize: f32 = min(1. / quality / distance, PI * 2.0);
  let angleStepNum: f32 = ceil(PI * 2.0 / angleStepSize);

  let px: vec2<f32> = vec2<f32>(1.0 / gfu.uInputSize.xy);

  var totalAlpha: f32 = 0.0;

  var direction: vec2<f32>;
  var displaced: vec2<f32>;
  var curColor: vec4<f32>;

  for (var angle = 0.0; angle < PI * 2.0; angle += angleStepSize) {
    direction = vec2<f32>(cos(angle), sin(angle)) * px;
    for (var curDistance = 0.0; curDistance < dist; curDistance+=1) {
      displaced = vec2<f32>(clamp(uv + direction * (curDistance + 1.0), gfu.uInputClamp.xy, gfu.uInputClamp.zw));
      curColor = textureSample(uTexture, uSampler, displaced);
      totalAlpha += (dist - curDistance) * curColor.a;
    }
  }
    
  curColor = textureSample(uTexture, uSampler, uv);

  let glowColorRGB = glowUniforms.uColor;
  let glowAlpha = glowUniforms.uAlpha;
  let glowColor = vec4<f32>(glowColorRGB, glowAlpha);
  let knockout: bool = glowUniforms.uKnockout > 0.5;
  let innerStrength = glowUniforms.uStrength[0];
  let outerStrength = glowUniforms.uStrength[1];

  let alphaRatio: f32 = (totalAlpha / (angleStepNum * dist * (dist + 1.0) / 2.0));
  let innerGlowAlpha: f32 = (1.0 - alphaRatio) * innerStrength * curColor.a * glowAlpha;
  let innerGlowStrength: f32 = min(1.0, innerGlowAlpha);
  
  let innerColor: vec4<f32> = mix(curColor, glowColor, innerGlowStrength);
  let outerGlowAlpha: f32 = alphaRatio * outerStrength * (1. - curColor.a) * glowAlpha;
  let outerGlowStrength: f32 = min(1.0 - innerColor.a, outerGlowAlpha);
  let outerGlowColor: vec4<f32> = outerGlowStrength * glowColor.rgba;
  
  if (knockout) {
    let resultAlpha: f32 = outerGlowAlpha + innerGlowAlpha;
    return vec4<f32>(glowColor.rgb * resultAlpha, resultAlpha);
  }
  else {
    return innerColor + outerGlowColor;
  }
}

const PI: f32 = 3.14159265358979323846264;`,$r=Object.defineProperty,ei=(e,t,n)=>t in e?$r(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,ti=(e,t,n)=>(ei(e,typeof t==`symbol`?t:t+``,n),n),ni=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=t.distance??10,r=t.quality??.1,i=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Qr,entryPoint:`mainFragment`}}),a=_.from({vertex:j,fragment:Zr.replace(/__ANGLE_STEP_SIZE__/gi,`${(1/r/n).toFixed(7)}`).replace(/__DIST__/gi,`${n.toFixed(0)}.0`),name:`glow-filter`});super({gpuProgram:i,glProgram:a,resources:{glowUniforms:{uDistance:{value:n,type:`f32`},uStrength:{value:[t.innerStrength,t.outerStrength],type:`vec2<f32>`},uColor:{value:new Float32Array(3),type:`vec3<f32>`},uAlpha:{value:t.alpha,type:`f32`},uQuality:{value:r,type:`f32`},uKnockout:{value:t?.knockout??!1?1:0,type:`f32`}}},padding:n}),ti(this,`uniforms`),ti(this,`_color`),this.uniforms=this.resources.glowUniforms.uniforms,this._color=new g,this.color=t.color??16777215}get distance(){return this.uniforms.uDistance}set distance(e){this.uniforms.uDistance=this.padding=e}get innerStrength(){return this.uniforms.uStrength[0]}set innerStrength(e){this.uniforms.uStrength[0]=e}get outerStrength(){return this.uniforms.uStrength[1]}set outerStrength(e){this.uniforms.uStrength[1]=e}get color(){return this._color.value}set color(e){this._color.setValue(e);let[t,n,r]=this._color.toArray();this.uniforms.uColor[0]=t,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(e){this.uniforms.uAlpha=e}get quality(){return this.uniforms.uQuality}set quality(e){this.uniforms.uQuality=e}get knockout(){return this.uniforms.uKnockout===1}set knockout(e){this.uniforms.uKnockout=+!!e}};ti(ni,`DEFAULT_OPTIONS`,{distance:10,outerStrength:4,innerStrength:0,color:16777215,alpha:1,quality:.1,knockout:!1});var ri=ni,ii=`in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec3 uHsl;
uniform float uAlpha;
uniform float uColorize;

// https://en.wikipedia.org/wiki/Luma_(video)
const vec3 weight = vec3(0.299, 0.587, 0.114);

float getWeightedAverage(vec3 rgb) {
    return rgb.r * weight.r + rgb.g * weight.g + rgb.b * weight.b;
}

// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786?permalink_comment_id=3195243#gistcomment-3195243
const vec3 k = vec3(0.57735, 0.57735, 0.57735);

vec3 hueShift(vec3 color, float angle) {
    float cosAngle = cos(angle);
    return vec3(
    color * cosAngle +
    cross(k, color) * sin(angle) +
    k * dot(k, color) * (1.0 - cosAngle)
    );
}

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    vec3 resultRGB = color.rgb;

    float hue = uHsl[0];
    float saturation = uHsl[1];
    float lightness = uHsl[2];

    // colorize
    if (uColorize > 0.5) {
        resultRGB = vec3(getWeightedAverage(resultRGB), 0., 0.);
    }

    // hue
    resultRGB = hueShift(resultRGB, hue);

    // saturation
    // https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/huesaturation.js
    float average = (resultRGB.r + resultRGB.g + resultRGB.b) / 3.0;

    if (saturation > 0.) {
        resultRGB += (average - resultRGB) * (1. - 1. / (1.001 - saturation));
    } else {
        resultRGB -= (average - resultRGB) * saturation;
    }

    // lightness
    resultRGB = mix(resultRGB, vec3(ceil(lightness)) * color.a, abs(lightness));

    // alpha
    finalColor = mix(color, vec4(resultRGB, color.a), uAlpha);
}
`,ai=`struct HslUniforms {
  uHsl:vec3<f32>,
  uColorize:f32,
  uAlpha:f32,
};

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> hslUniforms : HslUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
    let color: vec4<f32> = textureSample(uTexture, uSampler, uv);
    var resultRGB: vec3<f32> = color.rgb;

    let hue: f32 = hslUniforms.uHsl[0];
    let saturation: f32 = hslUniforms.uHsl[1];
    let lightness: f32 = hslUniforms.uHsl[2];

    // colorize
    if (hslUniforms.uColorize > 0.5) {
        resultRGB = vec3<f32>(dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114)), 0., 0.);
    }

    // hue
    resultRGB = hueShift(resultRGB, hue);

    // saturation
    // https://github.com/evanw/glfx.js/blob/master/src/filters/adjust/huesaturation.js
    let average: f32 = (resultRGB.r + resultRGB.g + resultRGB.b) / 3.0;

    if (saturation > 0.) {
        resultRGB += (average - resultRGB) * (1. - 1. / (1.001 - saturation));
    } else {
        resultRGB -= (average - resultRGB) * saturation;
    }

    // lightness
    resultRGB = mix(resultRGB, vec3<f32>(ceil(lightness)) * color.a, abs(lightness));

    // alpha
    return mix(color, vec4<f32>(resultRGB, color.a), hslUniforms.uAlpha);
}

// https://gist.github.com/mairod/a75e7b44f68110e1576d77419d608786?permalink_comment_id=3195243#gistcomment-3195243
const k: vec3<f32> = vec3(0.57735, 0.57735, 0.57735);

fn hueShift(color: vec3<f32>, angle: f32) -> vec3<f32> 
{
    let cosAngle: f32 = cos(angle);
    return vec3<f32>(
    color * cosAngle +
    cross(k, color) * sin(angle) +
    k * dot(k, color) * (1.0 - cosAngle)
    );
}`,oi=Object.defineProperty,si=(e,t,n)=>t in e?oi(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,ci=(e,t,n)=>(si(e,typeof t==`symbol`?t:t+``,n),n),li=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:ai,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:ii,name:`hsl-adjustment-filter`});super({gpuProgram:n,glProgram:r,resources:{hslUniforms:{uHsl:{value:new Float32Array(3),type:`vec3<f32>`},uColorize:{value:+!!t.colorize,type:`f32`},uAlpha:{value:t.alpha,type:`f32`}}}}),ci(this,`uniforms`),ci(this,`_hue`),this.uniforms=this.resources.hslUniforms.uniforms,Object.assign(this,t)}get hue(){return this._hue}set hue(e){this._hue=e,this.uniforms.uHsl[0]=Math.PI/180*e}get saturation(){return this.uniforms.uHsl[1]}set saturation(e){this.uniforms.uHsl[1]=e}get lightness(){return this.uniforms.uHsl[2]}set lightness(e){this.uniforms.uHsl[2]=e}get colorize(){return this.uniforms.uColorize===1}set colorize(e){this.uniforms.uColorize=+!!e}get alpha(){return this.uniforms.uAlpha}set alpha(e){this.uniforms.uAlpha=e}};ci(li,`DEFAULT_OPTIONS`,{hue:0,saturation:0,lightness:0,colorize:!1,alpha:1});var ui=li,di=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uVelocity;
uniform int uKernelSize;
uniform float uOffset;

uniform vec4 uInputSize;

const int MAX_KERNEL_SIZE = 2048;

// Notice:
// the perfect way:
//    int kernelSize = min(uKernelSize, MAX_KERNELSIZE);
// BUT in real use-case , uKernelSize < MAX_KERNELSIZE almost always.
// So use uKernelSize directly.

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (uKernelSize == 0)
    {
        finalColor = color;
        return;
    }

    vec2 velocity = uVelocity / uInputSize.xy;
    float offset = -uOffset / length(uVelocity) - 0.5;
    int k = uKernelSize - 1;

    for(int i = 0; i < MAX_KERNEL_SIZE - 1; i++) {
        if (i == k) {
            break;
        }
        vec2 bias = velocity * (float(i) / float(k) + offset);
        color += texture(uTexture, vTextureCoord + bias);
    }
    finalColor = color / float(uKernelSize);
}
`,fi=`struct MotionBlurUniforms {
  uVelocity: vec2<f32>,
  uKernelSize: i32,
  uOffset: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> motionBlurUniforms : MotionBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uVelocity = motionBlurUniforms.uVelocity;
  let uKernelSize = motionBlurUniforms.uKernelSize;
  let uOffset = motionBlurUniforms.uOffset;

  let velocity: vec2<f32> = uVelocity / gfu.uInputSize.xy;
  let offset: f32 = -uOffset / length(uVelocity) - 0.5;
  let k: i32 = min(uKernelSize - 1, MAX_KERNEL_SIZE - 1);

  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  for(var i: i32 = 0; i < k; i += 1) {
    let bias: vec2<f32> = velocity * (f32(i) / f32(k) + offset);
    color += textureSample(uTexture, uSampler, uv + bias);
  }
  
  return select(color / f32(uKernelSize), textureSample(uTexture, uSampler, uv), uKernelSize == 0);
}

const MAX_KERNEL_SIZE: i32 = 2048;`,pi=Object.defineProperty,mi=(e,t,n)=>t in e?pi(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,hi=(e,t,n)=>(mi(e,typeof t==`symbol`?t:t+``,n),n),gi=class e extends b{constructor(...t){let n=t[0]??{};(Array.isArray(n)||`x`in n&&`y`in n||n instanceof p)&&(u(`6.0.0`,`MotionBlurFilter constructor params are now options object. See params: { velocity, kernelSize, offset }`),n={velocity:{x:`x`in n?n.x:n[0],y:`y`in n?n.y:n[1]}},t[1]!==void 0&&(n.kernelSize=t[1]),t[2]!==void 0&&(n.offset=t[2])),n={...e.DEFAULT_OPTIONS,...n};let r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:fi,entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:di,name:`motion-blur-filter`});super({gpuProgram:r,glProgram:i,resources:{motionBlurUniforms:{uVelocity:{value:{x:0,y:0},type:`vec2<f32>`},uKernelSize:{value:Math.trunc(n.kernelSize??5),type:`i32`},uOffset:{value:n.offset,type:`f32`}}}}),hi(this,`uniforms`),hi(this,`_kernelSize`),this.uniforms=this.resources.motionBlurUniforms.uniforms,Object.assign(this,n)}get velocity(){return this.uniforms.uVelocity}set velocity(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uVelocity=e,this._updateDirty()}get velocityX(){return this.velocity.x}set velocityX(e){this.velocity.x=e,this._updateDirty()}get velocityY(){return this.velocity.y}set velocityY(e){this.velocity.y=e,this._updateDirty()}get kernelSize(){return this._kernelSize}set kernelSize(e){this._kernelSize=e,this._updateDirty()}get offset(){return this.uniforms.uOffset}set offset(e){this.uniforms.uOffset=e}_updateDirty(){this.padding=(Math.max(Math.abs(this.velocityX),Math.abs(this.velocityY))|0)+1,this.uniforms.uKernelSize=this.velocityX!==0||this.velocityY!==0?this._kernelSize:0}};hi(gi,`DEFAULT_OPTIONS`,{velocity:{x:0,y:0},kernelSize:5,offset:0});var _i=gi,vi=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uSepia;
uniform vec2 uNoise;
uniform vec3 uScratch;
uniform vec3 uVignetting;
uniform float uSeed;
uniform vec2 uDimensions;

uniform vec4 uInputSize;

const float SQRT_2 = 1.414213;
const vec3 SEPIA_RGB = vec3(112.0 / 255.0, 66.0 / 255.0, 20.0 / 255.0);

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 Overlay(vec3 src, vec3 dst)
{
    // if (dst <= 0.5) then: 2 * src * dst
    // if (dst > 0.5) then: 1 - 2 * (1 - dst) * (1 - src)
    return vec3((dst.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)),
                (dst.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)),
                (dst.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)));
}


void main()
{
    finalColor = texture(uTexture, vTextureCoord);
    vec3 color = finalColor.rgb;

    if (uSepia > 0.0)
    {
        float gray = (color.x + color.y + color.z) / 3.0;
        vec3 grayscale = vec3(gray);

        color = Overlay(SEPIA_RGB, grayscale);

        color = grayscale + uSepia * (color - grayscale);
    }

    vec2 coord = vTextureCoord * uInputSize.xy / uDimensions.xy;

    float vignette = uVignetting[0];
    float vignetteAlpha = uVignetting[1];
    float vignetteBlur = uVignetting[2];

    if (vignette > 0.0)
    {
        float outter = SQRT_2 - vignette * SQRT_2;
        vec2 dir = vec2(vec2(0.5, 0.5) - coord);
        dir.y *= uDimensions.y / uDimensions.x;
        float darker = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + vignetteBlur * SQRT_2), 0.0, 1.0);
        color.rgb *= darker + (1.0 - darker) * (1.0 - vignetteAlpha);
    }

    float scratch = uScratch[0];
    float scratchDensity = uScratch[1];
    float scratchWidth = uScratch[2];

    if (scratchDensity > uSeed && scratch != 0.0)
    {
        float phase = uSeed * 256.0;
        float s = mod(floor(phase), 2.0);
        float dist = 1.0 / scratchDensity;
        float d = distance(coord, vec2(uSeed * dist, abs(s - uSeed * dist)));
        if (d < uSeed * 0.6 + 0.4)
        {
            highp float period = scratchDensity * 10.0;

            float xx = coord.x * period + phase;
            float aa = abs(mod(xx, 0.5) * 4.0);
            float bb = mod(floor(xx / 0.5), 2.0);
            float yy = (1.0 - bb) * aa + bb * (2.0 - aa);

            float kk = 2.0 * period;
            float dw = scratchWidth / uDimensions.x * (0.75 + uSeed);
            float dh = dw * kk;

            float tine = (yy - (2.0 - dh));

            if (tine > 0.0) {
                float _sign = sign(scratch);

                tine = s * tine / period + scratch + 0.1;
                tine = clamp(tine + 1.0, 0.5 + _sign * 0.5, 1.5 + _sign * 0.5);

                color.rgb *= tine;
            }
        }
    }

    float noise = uNoise[0];
    float noiseSize = uNoise[1];

    if (noise > 0.0 && noiseSize > 0.0)
    {
        vec2 pixelCoord = vTextureCoord.xy * uInputSize.xy;
        pixelCoord.x = floor(pixelCoord.x / noiseSize);
        pixelCoord.y = floor(pixelCoord.y / noiseSize);
        // vec2 d = pixelCoord * noiseSize * vec2(1024.0 + uSeed * 512.0, 1024.0 - uSeed * 512.0);
        // float _noise = snoise(d) * 0.5;
        float _noise = rand(pixelCoord * noiseSize * uSeed) - 0.5;
        color += _noise * noise;
    }

    finalColor.rgb = color;
}`,yi=`struct OldFilmUniforms {
    uSepia: f32,
    uNoise: vec2<f32>,
    uScratch: vec3<f32>,
    uVignetting: vec3<f32>,
    uSeed: f32,
    uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> oldFilmUniforms : OldFilmUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);

  if (oldFilmUniforms.uSepia > 0.)
  {
    color = vec4<f32>(sepia(color.rgb), color.a);
  }

  let coord: vec2<f32> = uv * gfu.uInputSize.xy / oldFilmUniforms.uDimensions;

  if (oldFilmUniforms.uVignetting[0] > 0.)
  {
    color *= vec4<f32>(vec3<f32>(vignette(color.rgb, coord)), color.a);
  }

  let uScratch = oldFilmUniforms.uScratch; 

  if (uScratch[1] > oldFilmUniforms.uSeed && uScratch[0] != 0.)
  {
    color = vec4<f32>(scratch(color.rgb, coord), color.a);
  }

  let uNoise = oldFilmUniforms.uNoise;

  if (uNoise[0] > 0.0 && uNoise[1] > 0.0)
  {
    color += vec4<f32>(vec3<f32>(noise(uv)), color.a);
  }

  return color;
}

const SQRT_2: f32 = 1.414213;
const SEPIA_RGB: vec3<f32> = vec3<f32>(112.0 / 255.0, 66.0 / 255.0, 20.0 / 255.0);

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

fn rand(co: vec2<f32>) -> f32
{
  return fract(sin(dot(co, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn overlay(src: vec3<f32>, dst: vec3<f32>) -> vec3<f32>
{
    // if (dst <= 0.5) then: 2 * src * dst
    // if (dst > 0.5) then: 1 - 2 * (1 - dst) * (1 - src)

    return vec3<f32>(
      select((1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)), (2.0 * src.x * dst.x), (dst.x <= 0.5)), 
      select((1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)), (2.0 * src.y * dst.y), (dst.y <= 0.5)),
      select((1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)), (2.0 * src.z * dst.z), (dst.z <= 0.5))
    );
}

fn sepia(co: vec3<f32>) -> vec3<f32>
{
  let gray: f32 = (co.x + co.y + co.z) / 3.0;
  let grayscale: vec3<f32> = vec3<f32>(gray);
  let color = overlay(SEPIA_RGB, grayscale);
  return grayscale + oldFilmUniforms.uSepia * (color - grayscale);
}

fn vignette(co: vec3<f32>, coord: vec2<f32>) -> f32
{
  let uVignetting = oldFilmUniforms.uVignetting;
  let uDimensions = oldFilmUniforms.uDimensions;
  
  let outter: f32 = SQRT_2 - uVignetting[0] * SQRT_2;
  var dir: vec2<f32> = vec2<f32>(vec2<f32>(0.5) - coord);
  dir.y *= uDimensions.y / uDimensions.x;
  let darker: f32 = clamp((outter - length(dir) * SQRT_2) / ( 0.00001 + uVignetting[2] * SQRT_2), 0.0, 1.0);
  return darker + (1.0 - darker) * (1.0 - uVignetting[1]);
}

fn scratch(co: vec3<f32>, coord: vec2<f32>) -> vec3<f32>
{
  var color = co;
  let uScratch = oldFilmUniforms.uScratch;
  let uSeed = oldFilmUniforms.uSeed;
  let uDimensions = oldFilmUniforms.uDimensions;

  let phase: f32 = uSeed * 256.0;
  let s: f32 = modulo(floor(phase), 2.0);
  let dist: f32 = 1.0 / uScratch[1];
  let d: f32 = distance(coord, vec2<f32>(uSeed * dist, abs(s - uSeed * dist)));

  if (d < uSeed * 0.6 + 0.4)
  {
    let period: f32 = uScratch[1] * 10.0;

    let xx: f32 = coord.x * period + phase;
    let aa: f32 = abs(modulo(xx, 0.5) * 4.0);
    let bb: f32 = modulo(floor(xx / 0.5), 2.0);
    let yy: f32 = (1.0 - bb) * aa + bb * (2.0 - aa);

    let kk: f32 = 2.0 * period;
    let dw: f32 = uScratch[2] / uDimensions.x * (0.75 + uSeed);
    let dh: f32 = dw * kk;

    var tine: f32 = (yy - (2.0 - dh));

    if (tine > 0.0) {
        let _sign: f32 = sign(uScratch[0]);

        tine = s * tine / period + uScratch[0] + 0.1;
        tine = clamp(tine + 1.0, 0.5 + _sign * 0.5, 1.5 + _sign * 0.5);

        color *= tine;
    }
  }

  return color;
}

fn noise(coord: vec2<f32>) -> f32
{
  let uNoise = oldFilmUniforms.uNoise;
  let uSeed = oldFilmUniforms.uSeed;

  var pixelCoord: vec2<f32> = coord * gfu.uInputSize.xy;
  pixelCoord.x = floor(pixelCoord.x / uNoise[1]);
  pixelCoord.y = floor(pixelCoord.y / uNoise[1]);
  return (rand(pixelCoord * uNoise[1] * uSeed) - 0.5) * uNoise[0];
}`,bi=Object.defineProperty,xi=(e,t,n)=>t in e?bi(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Si=(e,t,n)=>(xi(e,typeof t==`symbol`?t:t+``,n),n),Ci=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:yi,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:vi,name:`old-film-filter`});super({gpuProgram:n,glProgram:r,resources:{oldFilmUniforms:{uSepia:{value:t.sepia,type:`f32`},uNoise:{value:new Float32Array(2),type:`vec2<f32>`},uScratch:{value:new Float32Array(3),type:`vec3<f32>`},uVignetting:{value:new Float32Array(3),type:`vec3<f32>`},uSeed:{value:t.seed,type:`f32`},uDimensions:{value:new Float32Array(2),type:`vec2<f32>`}}}}),Si(this,`uniforms`),Si(this,`seed`),this.uniforms=this.resources.oldFilmUniforms.uniforms,Object.assign(this,t)}apply(e,t,n,r){this.uniforms.uDimensions[0]=t.frame.width,this.uniforms.uDimensions[1]=t.frame.height,this.uniforms.uSeed=this.seed,e.applyFilter(this,t,n,r)}get sepia(){return this.uniforms.uSepia}set sepia(e){this.uniforms.uSepia=e}get noise(){return this.uniforms.uNoise[0]}set noise(e){this.uniforms.uNoise[0]=e}get noiseSize(){return this.uniforms.uNoise[1]}set noiseSize(e){this.uniforms.uNoise[1]=e}get scratch(){return this.uniforms.uScratch[0]}set scratch(e){this.uniforms.uScratch[0]=e}get scratchDensity(){return this.uniforms.uScratch[1]}set scratchDensity(e){this.uniforms.uScratch[1]=e}get scratchWidth(){return this.uniforms.uScratch[2]}set scratchWidth(e){this.uniforms.uScratch[2]=e}get vignetting(){return this.uniforms.uVignetting[0]}set vignetting(e){this.uniforms.uVignetting[0]=e}get vignettingAlpha(){return this.uniforms.uVignetting[1]}set vignettingAlpha(e){this.uniforms.uVignetting[1]=e}get vignettingBlur(){return this.uniforms.uVignetting[2]}set vignettingBlur(e){this.uniforms.uVignetting[2]=e}};Si(Ci,`DEFAULT_OPTIONS`,{sepia:.3,noise:.3,noiseSize:1,scratch:.5,scratchDensity:.3,scratchWidth:1,vignetting:.3,vignettingAlpha:1,vignettingBlur:.3,seed:0});var wi=Ci,Ti=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uThickness;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uKnockout;

uniform vec4 uInputClamp;

const float DOUBLE_PI = 2. * 3.14159265358979323846264;
const float ANGLE_STEP = \${ANGLE_STEP};

float outlineMaxAlphaAtPos(vec2 pos) {
    if (uThickness.x == 0. || uThickness.y == 0.) {
        return 0.;
    }

    vec4 displacedColor;
    vec2 displacedPos;
    float maxAlpha = 0.;

    for (float angle = 0.; angle <= DOUBLE_PI; angle += ANGLE_STEP) {
        displacedPos.x = vTextureCoord.x + uThickness.x * cos(angle);
        displacedPos.y = vTextureCoord.y + uThickness.y * sin(angle);
        displacedColor = texture(uTexture, clamp(displacedPos, uInputClamp.xy, uInputClamp.zw));
        maxAlpha = max(maxAlpha, displacedColor.a);
    }

    return maxAlpha;
}

void main(void) {
    vec4 sourceColor = texture(uTexture, vTextureCoord);
    vec4 contentColor = sourceColor * float(uKnockout < 0.5);
    float outlineAlpha = uAlpha * outlineMaxAlphaAtPos(vTextureCoord.xy) * (1.-sourceColor.a);
    vec4 outlineColor = vec4(vec3(uColor) * outlineAlpha, outlineAlpha);
    finalColor = contentColor + outlineColor;
}
`,Ei=`struct OutlineUniforms {
  uThickness:vec2<f32>,
  uColor:vec3<f32>,
  uAlpha:f32,
  uAngleStep:f32,
  uKnockout:f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> outlineUniforms : OutlineUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let sourceColor: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let contentColor: vec4<f32> = sourceColor * (1. - outlineUniforms.uKnockout);
  
  let outlineAlpha: f32 = outlineUniforms.uAlpha * outlineMaxAlphaAtPos(uv) * (1. - sourceColor.a);
  let outlineColor: vec4<f32> = vec4<f32>(vec3<f32>(outlineUniforms.uColor) * outlineAlpha, outlineAlpha);
  
  return contentColor + outlineColor;
}

fn outlineMaxAlphaAtPos(uv: vec2<f32>) -> f32 {
  let thickness = outlineUniforms.uThickness;

  if (thickness.x == 0. || thickness.y == 0.) {
    return 0.;
  }
  
  let angleStep = outlineUniforms.uAngleStep;

  var displacedColor: vec4<f32>;
  var displacedPos: vec2<f32>;

  var maxAlpha: f32 = 0.;
  var displaced: vec2<f32>;
  var curColor: vec4<f32>;

  for (var angle = 0.; angle <= DOUBLE_PI; angle += angleStep)
  {
    displaced.x = uv.x + thickness.x * cos(angle);
    displaced.y = uv.y + thickness.y * sin(angle);
    curColor = textureSample(uTexture, uSampler, clamp(displaced, gfu.uInputClamp.xy, gfu.uInputClamp.zw));
    maxAlpha = max(maxAlpha, curColor.a);
  }

  return maxAlpha;
}

const DOUBLE_PI: f32 = 3.14159265358979323846264 * 2.;`,Di=Object.defineProperty,Oi=(e,t,n)=>t in e?Di(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,B=(e,t,n)=>(Oi(e,typeof t==`symbol`?t:t+``,n),n),ki=class e extends b{constructor(...t){let n=t[0]??{};typeof n==`number`&&(u(`6.0.0`,`OutlineFilter constructor params are now options object. See params: { thickness, color, quality, alpha, knockout }`),n={thickness:n},t[1]!==void 0&&(n.color=t[1]),t[2]!==void 0&&(n.quality=t[2]),t[3]!==void 0&&(n.alpha=t[3]),t[4]!==void 0&&(n.knockout=t[4])),n={...e.DEFAULT_OPTIONS,...n};let r=n.quality??.1,i=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Ei,entryPoint:`mainFragment`}}),a=_.from({vertex:j,fragment:Ti.replace(/\$\{ANGLE_STEP\}/,e.getAngleStep(r).toFixed(7)),name:`outline-filter`});super({gpuProgram:i,glProgram:a,resources:{outlineUniforms:{uThickness:{value:new Float32Array(2),type:`vec2<f32>`},uColor:{value:new Float32Array(3),type:`vec3<f32>`},uAlpha:{value:n.alpha,type:`f32`},uAngleStep:{value:0,type:`f32`},uKnockout:{value:+!!n.knockout,type:`f32`}}}}),B(this,`uniforms`),B(this,`_thickness`),B(this,`_quality`),B(this,`_color`),this.uniforms=this.resources.outlineUniforms.uniforms,this.uniforms.uAngleStep=e.getAngleStep(r),this._color=new g,this.color=n.color??0,Object.assign(this,n)}apply(e,t,n,r){this.uniforms.uThickness[0]=this.thickness/t.source.width,this.uniforms.uThickness[1]=this.thickness/t.source.height,e.applyFilter(this,t,n,r)}static getAngleStep(t){return parseFloat((Math.PI*2/Math.max(t*e.MAX_SAMPLES,e.MIN_SAMPLES)).toFixed(7))}get thickness(){return this._thickness}set thickness(e){this._thickness=this.padding=e}get color(){return this._color.value}set color(e){this._color.setValue(e);let[t,n,r]=this._color.toArray();this.uniforms.uColor[0]=t,this.uniforms.uColor[1]=n,this.uniforms.uColor[2]=r}get alpha(){return this.uniforms.uAlpha}set alpha(e){this.uniforms.uAlpha=e}get quality(){return this._quality}set quality(t){this._quality=t,this.uniforms.uAngleStep=e.getAngleStep(t)}get knockout(){return this.uniforms.uKnockout===1}set knockout(e){this.uniforms.uKnockout=+!!e}};B(ki,`DEFAULT_OPTIONS`,{thickness:1,color:0,alpha:1,quality:.1,knockout:!1}),B(ki,`MIN_SAMPLES`,1),B(ki,`MAX_SAMPLES`,100);var Ai=ki,ji=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform vec2 uSize;
uniform sampler2D uTexture;
uniform vec4 uInputSize;

vec2 mapCoord( vec2 coord )
{
    coord *= uInputSize.xy;
    coord += uInputSize.zw;

    return coord;
}

vec2 unmapCoord( vec2 coord )
{
    coord -= uInputSize.zw;
    coord /= uInputSize.xy;

    return coord;
}

vec2 pixelate(vec2 coord, vec2 uSize)
{
	return floor( coord / uSize ) * uSize;
}

void main(void)
{
    vec2 coord = mapCoord(vTextureCoord);
    coord = pixelate(coord, uSize);
    coord = unmapCoord(coord);
    finalColor = texture(uTexture, coord);
}
`,Mi=`struct PixelateUniforms {
  uSize:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> pixelateUniforms : PixelateUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
  let pixelSize: vec2<f32> = pixelateUniforms.uSize;
  let coord: vec2<f32> = mapCoord(uv);

  var pixCoord: vec2<f32> = pixelate(coord, pixelSize);
  pixCoord = unmapCoord(pixCoord);

  return textureSample(uTexture, uSampler, pixCoord);
}

fn mapCoord(coord: vec2<f32> ) -> vec2<f32>
{
  var mappedCoord: vec2<f32> = coord;
  mappedCoord *= gfu.uInputSize.xy;
  mappedCoord += gfu.uOutputFrame.xy;
  return mappedCoord;
}

fn unmapCoord(coord: vec2<f32> ) -> vec2<f32>
{
  var mappedCoord: vec2<f32> = coord;
  mappedCoord -= gfu.uOutputFrame.xy;
  mappedCoord /= gfu.uInputSize.xy;
  return mappedCoord;
}

fn pixelate(coord: vec2<f32>, size: vec2<f32>) -> vec2<f32>
{
  return floor( coord / size ) * size;
}

`,Ni=class extends b{constructor(e=10){let t=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Mi,entryPoint:`mainFragment`}}),n=_.from({vertex:j,fragment:ji,name:`pixelate-filter`});super({gpuProgram:t,glProgram:n,resources:{pixelateUniforms:{uSize:{value:new Float32Array(2),type:`vec2<f32>`}}}}),this.size=e}get size(){return this.resources.pixelateUniforms.uniforms.uSize}set size(e){e instanceof h?(this.sizeX=e.x,this.sizeY=e.y):Array.isArray(e)?this.resources.pixelateUniforms.uniforms.uSize=e:this.sizeX=this.sizeY=e}get sizeX(){return this.resources.pixelateUniforms.uniforms.uSize[0]}set sizeX(e){this.resources.pixelateUniforms.uniforms.uSize[0]=e}get sizeY(){return this.resources.pixelateUniforms.uniforms.uSize[1]}set sizeY(e){this.resources.pixelateUniforms.uniforms.uSize[1]=e}},Pi=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uRadian;
uniform vec2 uCenter;
uniform float uRadius;
uniform int uKernelSize;

uniform vec4 uInputSize;

const int MAX_KERNEL_SIZE = 2048;

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    if (uKernelSize == 0)
    {
        finalColor = color;
        return;
    }

    float aspect = uInputSize.y / uInputSize.x;
    vec2 center = uCenter.xy / uInputSize.xy;
    float gradient = uRadius / uInputSize.x * 0.3;
    float radius = uRadius / uInputSize.x - gradient * 0.5;
    int k = uKernelSize - 1;

    vec2 coord = vTextureCoord;
    vec2 dir = vec2(center - coord);
    float dist = length(vec2(dir.x, dir.y * aspect));

    float radianStep = uRadian;
    if (radius >= 0.0 && dist > radius) {
        float delta = dist - radius;
        float gap = gradient;
        float scale = 1.0 - abs(delta / gap);
        if (scale <= 0.0) {
            finalColor = color;
            return;
        }
        radianStep *= scale;
    }
    radianStep /= float(k);

    float s = sin(radianStep);
    float c = cos(radianStep);
    mat2 rotationMatrix = mat2(vec2(c, -s), vec2(s, c));

    for(int i = 0; i < MAX_KERNEL_SIZE - 1; i++) {
        if (i == k) {
            break;
        }

        coord -= center;
        coord.y *= aspect;
        coord = rotationMatrix * coord;
        coord.y /= aspect;
        coord += center;

        vec4 sample = texture(uTexture, coord);

        // switch to pre-multiplied alpha to correctly blur transparent images
        // sample.rgb *= sample.a;

        color += sample;
    }

    finalColor = color / float(uKernelSize);
}
`,Fi=`struct RadialBlurUniforms {
  uRadian: f32,
  uCenter: vec2<f32>,
  uKernelSize: f32,
  uRadius: f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> radialBlurUniforms : RadialBlurUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uRadian = radialBlurUniforms.uRadian;
  let uCenter = radialBlurUniforms.uCenter;
  let uKernelSize = radialBlurUniforms.uKernelSize;
  let uRadius = radialBlurUniforms.uRadius;
  
  var returnColorOnly = false;

  if (uKernelSize == 0)
  {
    returnColorOnly = true;
  }

  let aspect: f32 = gfu.uInputSize.y / gfu.uInputSize.x;
  let center: vec2<f32> = uCenter.xy / gfu.uInputSize.xy;
  let gradient: f32 = uRadius / gfu.uInputSize.x * 0.3;
  let radius: f32 = uRadius / gfu.uInputSize.x - gradient * 0.5;
  let k: i32 = i32(uKernelSize - 1);

  var coord: vec2<f32> = uv;
  let dir: vec2<f32> = vec2<f32>(center - coord);
  let dist: f32 = length(vec2<f32>(dir.x, dir.y * aspect));

  var radianStep: f32 = uRadian;
  
  if (radius >= 0.0 && dist > radius)
  {
    let delta: f32 = dist - radius;
    let gap: f32 = gradient;
    let scale: f32 = 1.0 - abs(delta / gap);
    if (scale <= 0.0) {
      returnColorOnly = true;
    }
    radianStep *= scale;
  }

  radianStep /= f32(k);

  let s: f32 = sin(radianStep);
  let c: f32 = cos(radianStep);
  let rotationMatrix: mat2x2<f32> = mat2x2<f32>(vec2<f32>(c, -s), vec2<f32>(s, c));
  
  var color: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let baseColor = vec4<f32>(color);

  let minK: i32 = min(i32(uKernelSize) - 1, MAX_KERNEL_SIZE - 1);

  for(var i: i32 = 0; i < minK; i += 1) 
  {
    coord -= center;
    coord.y *= aspect;
    coord = rotationMatrix * coord;
    coord.y /= aspect;
    coord += center;
    let sample: vec4<f32> = textureSample(uTexture, uSampler, coord);
    // switch to pre-multiplied alpha to correctly blur transparent images
    // sample.rgb *= sample.a;
    color += sample;
  }

  return select(color / f32(uKernelSize), baseColor, returnColorOnly);
}

const MAX_KERNEL_SIZE: i32 = 2048;`,Ii=Object.defineProperty,Li=(e,t,n)=>t in e?Ii(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Ri=(e,t,n)=>(Li(e,typeof t==`symbol`?t:t+``,n),n),zi=class e extends b{constructor(...t){let n=t[0]??{};if(typeof n==`number`){if(u(`6.0.0`,`RadialBlurFilter constructor params are now options object. See params: { angle, center, kernelSize, radius }`),n={angle:n},t[1]){let e=`x`in t[1]?t[1].x:t[1][0],r=`y`in t[1]?t[1].y:t[1][1];n.center={x:e,y:r}}t[2]&&(n.kernelSize=t[2]),t[3]&&(n.radius=t[3])}n={...e.DEFAULT_OPTIONS,...n};let r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Fi,entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:Pi,name:`radial-blur-filter`});super({gpuProgram:r,glProgram:i,resources:{radialBlurUniforms:{uRadian:{value:0,type:`f32`},uCenter:{value:{x:0,y:0},type:`vec2<f32>`},uKernelSize:{value:n.kernelSize,type:`i32`},uRadius:{value:n.radius,type:`f32`}}}}),Ri(this,`uniforms`),Ri(this,`_angle`),Ri(this,`_kernelSize`),this.uniforms=this.resources.radialBlurUniforms.uniforms,Object.assign(this,n)}_updateKernelSize(){this.uniforms.uKernelSize=this._angle===0?0:this.kernelSize}get angle(){return this._angle}set angle(e){this._angle=e,this.uniforms.uRadian=e*Math.PI/180,this._updateKernelSize()}get center(){return this.uniforms.uCenter}set center(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uCenter=e}get centerX(){return this.center.x}set centerX(e){this.center.x=e}get centerY(){return this.center.y}set centerY(e){this.center.y=e}get kernelSize(){return this._kernelSize}set kernelSize(e){this._kernelSize=e,this._updateKernelSize()}get radius(){return this.uniforms.uRadius}set radius(e){this.uniforms.uRadius=e<0||e===1/0?-1:e}};Ri(zi,`DEFAULT_OPTIONS`,{angle:0,center:{x:0,y:0},kernelSize:5,radius:-1});var Bi=zi,Vi=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uMirror;
uniform float uBoundary;
uniform vec2 uAmplitude;
uniform vec2 uWavelength;
uniform vec2 uAlpha;
uniform float uTime;
uniform vec2 uDimensions;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    vec2 pixelCoord = vTextureCoord.xy * uInputSize.xy;
    vec2 coord = pixelCoord / uDimensions;

    if (coord.y < uBoundary) {
        finalColor = texture(uTexture, vTextureCoord);
        return;
    }

    float k = (coord.y - uBoundary) / (1. - uBoundary + 0.0001);
    float areaY = uBoundary * uDimensions.y / uInputSize.y;
    float v = areaY + areaY - vTextureCoord.y;
    float y = uMirror > 0.5 ? v : vTextureCoord.y;

    float _amplitude = ((uAmplitude.y - uAmplitude.x) * k + uAmplitude.x ) / uInputSize.x;
    float _waveLength = ((uWavelength.y - uWavelength.x) * k + uWavelength.x) / uInputSize.y;
    float _alpha = (uAlpha.y - uAlpha.x) * k + uAlpha.x;

    float x = vTextureCoord.x + cos(v * 6.28 / _waveLength - uTime) * _amplitude;
    x = clamp(x, uInputClamp.x, uInputClamp.z);

    vec4 color = texture(uTexture, vec2(x, y));

    finalColor = color * _alpha;
}
`,Hi=`struct ReflectionUniforms {
  uMirror: f32,
  uBoundary: f32,
  uAmplitude: vec2<f32>,
  uWavelength: vec2<f32>,
  uAlpha: vec2<f32>,
  uTime: f32,
  uDimensions: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> reflectionUniforms : ReflectionUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uDimensions: vec2<f32> = reflectionUniforms.uDimensions;
  let uBoundary: f32 = reflectionUniforms.uBoundary;
  let uMirror: bool = reflectionUniforms.uMirror > 0.5;
  let uAmplitude: vec2<f32> = reflectionUniforms.uAmplitude;
  let uWavelength: vec2<f32> = reflectionUniforms.uWavelength;
  let uAlpha: vec2<f32> = reflectionUniforms.uAlpha;
  let uTime: f32 = reflectionUniforms.uTime;

  let pixelCoord: vec2<f32> = uv * gfu.uInputSize.xy;
  let coord: vec2<f32> = pixelCoord /uDimensions;
  var returnColorOnly: bool = false;

  if (coord.y < uBoundary) {
    returnColorOnly = true;
  }

  let k: f32 = (coord.y - uBoundary) / (1. - uBoundary + 0.0001);
  let areaY: f32 = uBoundary * uDimensions.y / gfu.uInputSize.y;
  let v: f32 = areaY + areaY - uv.y;
  let y: f32 = select(uv.y, v, uMirror);

  let amplitude: f32 = ((uAmplitude.y - uAmplitude.x) * k + uAmplitude.x ) / gfu.uInputSize.x;
  let waveLength: f32 = ((uWavelength.y - uWavelength.x) * k + uWavelength.x) / gfu.uInputSize.y;
  let alpha: f32 = select((uAlpha.y - uAlpha.x) * k + uAlpha.x, 1., returnColorOnly);

  var x: f32 = uv.x + cos(v * 6.28 / waveLength - uTime) * amplitude;
  x = clamp(x, gfu.uInputClamp.x, gfu.uInputClamp.z);
  
  return textureSample(uTexture, uSampler, select(vec2<f32>(x, y), uv, returnColorOnly)) * alpha;
}

fn rand(co: vec2<f32>) -> f32 
{
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}`,Ui=Object.defineProperty,Wi=(e,t,n)=>t in e?Ui(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Gi=(e,t,n)=>(Wi(e,typeof t==`symbol`?t:t+``,n),n),Ki=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Hi,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:Vi,name:`reflection-filter`});super({gpuProgram:n,glProgram:r,resources:{reflectionUniforms:{uMirror:{value:+!!t.mirror,type:`f32`},uBoundary:{value:t.boundary,type:`f32`},uAmplitude:{value:t.amplitude,type:`vec2<f32>`},uWavelength:{value:t.waveLength,type:`vec2<f32>`},uAlpha:{value:t.alpha,type:`vec2<f32>`},uTime:{value:t.time,type:`f32`},uDimensions:{value:new Float32Array(2),type:`vec2<f32>`}}}}),Gi(this,`uniforms`),Gi(this,`time`,0),this.uniforms=this.resources.reflectionUniforms.uniforms,Object.assign(this,t)}apply(e,t,n,r){this.uniforms.uDimensions[0]=t.frame.width,this.uniforms.uDimensions[1]=t.frame.height,this.uniforms.uTime=this.time,e.applyFilter(this,t,n,r)}get mirror(){return this.uniforms.uMirror>.5}set mirror(e){this.uniforms.uMirror=+!!e}get boundary(){return this.uniforms.uBoundary}set boundary(e){this.uniforms.uBoundary=e}get amplitude(){return Array.from(this.uniforms.uAmplitude)}set amplitude(e){this.uniforms.uAmplitude[0]=e[0],this.uniforms.uAmplitude[1]=e[1]}get amplitudeStart(){return this.uniforms.uAmplitude[0]}set amplitudeStart(e){this.uniforms.uAmplitude[0]=e}get amplitudeEnd(){return this.uniforms.uAmplitude[1]}set amplitudeEnd(e){this.uniforms.uAmplitude[1]=e}get waveLength(){return Array.from(this.uniforms.uWavelength)}set waveLength(e){this.uniforms.uWavelength[0]=e[0],this.uniforms.uWavelength[1]=e[1]}get wavelengthStart(){return this.uniforms.uWavelength[0]}set wavelengthStart(e){this.uniforms.uWavelength[0]=e}get wavelengthEnd(){return this.uniforms.uWavelength[1]}set wavelengthEnd(e){this.uniforms.uWavelength[1]=e}get alpha(){return Array.from(this.uniforms.uAlpha)}set alpha(e){this.uniforms.uAlpha[0]=e[0],this.uniforms.uAlpha[1]=e[1]}get alphaStart(){return this.uniforms.uAlpha[0]}set alphaStart(e){this.uniforms.uAlpha[0]=e}get alphaEnd(){return this.uniforms.uAlpha[1]}set alphaEnd(e){this.uniforms.uAlpha[1]=e}};Gi(Ki,`DEFAULT_OPTIONS`,{mirror:!0,boundary:.5,amplitude:[0,20],waveLength:[30,100],alpha:[1,1],time:0});var qi=Ki,Ji=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec2 uRed;
uniform vec2 uGreen;
uniform vec2 uBlue;

void main(void)
{
   float r = texture(uTexture, vTextureCoord + uRed/uInputSize.xy).r;
   float g = texture(uTexture, vTextureCoord + uGreen/uInputSize.xy).g;
   float b = texture(uTexture, vTextureCoord + uBlue/uInputSize.xy).b;
   float a = texture(uTexture, vTextureCoord).a;
   finalColor = vec4(r, g, b, a);
}
`,Yi=`struct RgbSplitUniforms {
    uRed: vec2<f32>,
    uGreen: vec2<f32>,
    uBlue: vec3<f32>,
};

struct GlobalFilterUniforms {
    uInputSize:vec4<f32>,
    uInputPixel:vec4<f32>,
    uInputClamp:vec4<f32>,
    uOutputFrame:vec4<f32>,
    uGlobalFrame:vec4<f32>,
    uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> rgbSplitUniforms : RgbSplitUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
    let r = textureSample(uTexture, uSampler, uv + vec2<f32>(rgbSplitUniforms.uRed.x / gfu.uInputSize.x, rgbSplitUniforms.uRed.y / gfu.uInputSize.y)).r;
    let g = textureSample(uTexture, uSampler, uv + vec2<f32>(rgbSplitUniforms.uGreen.x / gfu.uInputSize.x, rgbSplitUniforms.uGreen.y / gfu.uInputSize.y)).g;
    let b = textureSample(uTexture, uSampler, uv + vec2<f32>(rgbSplitUniforms.uBlue.x / gfu.uInputSize.x, rgbSplitUniforms.uBlue.y / gfu.uInputSize.y)).b;
    let a = textureSample(uTexture, uSampler, uv).a;
    return vec4<f32>(r, g, b, a);
}
`,Xi=Object.defineProperty,Zi=(e,t,n)=>t in e?Xi(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Qi=(e,t,n)=>(Zi(e,typeof t==`symbol`?t:t+``,n),n),$i=class e extends b{constructor(...t){let n=t[0]??{};(Array.isArray(n)||`x`in n&&`y`in n)&&(u(`6.0.0`,`RGBSplitFilter constructor params are now options object. See params: { red, green, blue }`),n={red:n},t[1]!==void 0&&(n.green=t[1]),t[2]!==void 0&&(n.blue=t[2])),n={...e.DEFAULT_OPTIONS,...n};let r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Yi,entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:Ji,name:`rgb-split-filter`});super({gpuProgram:r,glProgram:i,resources:{rgbSplitUniforms:{uRed:{value:{x:0,y:0},type:`vec2<f32>`},uGreen:{value:{x:0,y:0},type:`vec2<f32>`},uBlue:{value:{x:0,y:0},type:`vec2<f32>`}}}}),Qi(this,`uniforms`),this.uniforms=this.resources.rgbSplitUniforms.uniforms,Object.assign(this,n)}get red(){return this.uniforms.uRed}set red(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uRed=e}get redX(){return this.red.x}set redX(e){this.red.x=e}get redY(){return this.red.y}set redY(e){this.red.y=e}get green(){return this.uniforms.uGreen}set green(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uGreen=e}get greenX(){return this.green.x}set greenX(e){this.green.x=e}get greenY(){return this.green.y}set greenY(e){this.green.y=e}get blue(){return this.uniforms.uBlue}set blue(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uBlue=e}get blueX(){return this.blue.x}set blueX(e){this.blue.x=e}get blueY(){return this.blue.y}set blueY(e){this.blue.y=e}};Qi($i,`DEFAULT_OPTIONS`,{red:{x:-10,y:0},green:{x:0,y:10},blue:{x:0,y:0}});var ea=$i,ta=`
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uCenter;
uniform float uTime;
uniform float uSpeed;
uniform vec4 uWave;

uniform vec4 uInputSize;
uniform vec4 uInputClamp;

const float PI = 3.14159;

void main()
{
    float uAmplitude = uWave[0];
    float uWavelength = uWave[1];
    float uBrightness = uWave[2];
    float uRadius = uWave[3];

    float halfWavelength = uWavelength * 0.5 / uInputSize.x;
    float maxRadius = uRadius / uInputSize.x;
    float currentRadius = uTime * uSpeed / uInputSize.x;

    float fade = 1.0;

    if (maxRadius > 0.0) {
        if (currentRadius > maxRadius) {
            finalColor = texture(uTexture, vTextureCoord);
            return;
        }
        fade = 1.0 - pow(currentRadius / maxRadius, 2.0);
    }

    vec2 dir = vec2(vTextureCoord - uCenter / uInputSize.xy);
    dir.y *= uInputSize.y / uInputSize.x;
    float dist = length(dir);

    if (dist <= 0.0 || dist < currentRadius - halfWavelength || dist > currentRadius + halfWavelength) {
        finalColor = texture(uTexture, vTextureCoord);
        return;
    }

    vec2 diffUV = normalize(dir);

    float diff = (dist - currentRadius) / halfWavelength;

    float p = 1.0 - pow(abs(diff), 2.0);

    // float powDiff = diff * pow(p, 2.0) * ( amplitude * fade );
    float powDiff = 1.25 * sin(diff * PI) * p * ( uAmplitude * fade );

    vec2 offset = diffUV * powDiff / uInputSize.xy;

    // Do clamp :
    vec2 coord = vTextureCoord + offset;
    vec2 clampedCoord = clamp(coord, uInputClamp.xy, uInputClamp.zw);
    vec4 color = texture(uTexture, clampedCoord);
    if (coord != clampedCoord) {
        color *= max(0.0, 1.0 - length(coord - clampedCoord));
    }

    // No clamp :
    // finalColor = texture(uTexture, vTextureCoord + offset);

    color.rgb *= 1.0 + (uBrightness - 1.0) * p * fade;

    finalColor = color;
}
`,na=`
struct ShockWaveUniforms {
    uTime: f32,
    uOffset: vec2<f32>,
    uSpeed: f32,
    uWave: vec4<f32>,
};

struct GlobalFilterUniforms {
    uInputSize:vec4<f32>,
    uInputPixel:vec4<f32>,
    uInputClamp:vec4<f32>,
    uOutputFrame:vec4<f32>,
    uGlobalFrame:vec4<f32>,
    uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> shockwaveUniforms : ShockWaveUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {

    let uTime = shockwaveUniforms.uTime;
    let uOffset = shockwaveUniforms.uOffset;
    let uSpeed = shockwaveUniforms.uSpeed;
    let uAmplitude = shockwaveUniforms.uWave[0];
    let uWavelength = shockwaveUniforms.uWave[1];
    let uBrightness = shockwaveUniforms.uWave[2];
    let uRadius = shockwaveUniforms.uWave[3];
    let halfWavelength: f32 = uWavelength * 0.5 / gfu.uInputSize.x;
    let maxRadius: f32 = uRadius / gfu.uInputSize.x;
    let currentRadius: f32 = uTime * uSpeed / gfu.uInputSize.x;
    var fade: f32 = 1.0;
    var returnColorOnly: bool = false;
    
    if (maxRadius > 0.0) {
        if (currentRadius > maxRadius) {
            returnColorOnly = true;
        }
        fade = 1.0 - pow(currentRadius / maxRadius, 2.0);
    }
    var dir: vec2<f32> = vec2<f32>(uv - uOffset / gfu.uInputSize.xy);
    dir.y *= gfu.uInputSize.y / gfu.uInputSize.x;

    let dist:f32 = length(dir);

    if (dist <= 0.0 || dist < currentRadius - halfWavelength || dist > currentRadius + halfWavelength) {
        returnColorOnly = true;
    }

    let diffUV: vec2<f32> = normalize(dir);
    let diff: f32 = (dist - currentRadius) / halfWavelength;
    let p: f32 = 1.0 - pow(abs(diff), 2.0);
    let powDiff: f32 = 1.25 * sin(diff * PI) * p * ( uAmplitude * fade );
    let offset: vec2<f32> = diffUV * powDiff / gfu.uInputSize.xy;
    // Do clamp :
    let coord: vec2<f32> = uv + offset;
    let clampedCoord: vec2<f32> = clamp(coord, gfu.uInputClamp.xy, gfu.uInputClamp.zw);

    var clampedColor: vec4<f32> = textureSample(uTexture, uSampler, clampedCoord);
    
    if (boolVec2(coord, clampedCoord)) 
    {
        clampedColor *= max(0.0, 1.0 - length(coord - clampedCoord));
    }
    // No clamp :
    var finalColor = clampedColor;

    return select(finalColor, textureSample(uTexture, uSampler, uv), returnColorOnly);
}

fn boolVec2(x: vec2<f32>, y: vec2<f32>) -> bool
{
    if (x.x == y.x && x.y == y.y)
    {
        return true;
    }
    
    return false;
}

const PI: f32 = 3.14159265358979323846264;
`,ra=Object.defineProperty,ia=(e,t,n)=>t in e?ra(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,aa=(e,t,n)=>(ia(e,typeof t==`symbol`?t:t+``,n),n),oa=class e extends b{constructor(...t){let n=t[0]??{};(Array.isArray(n)||`x`in n&&`y`in n)&&(u(`6.0.0`,`ShockwaveFilter constructor params are now options object. See params: { center, speed, amplitude, wavelength, brightness, radius, time }`),n={center:n,...t[1]},t[2]!==void 0&&(n.time=t[2])),n={...e.DEFAULT_OPTIONS,...n};let r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:na,entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:ta,name:`shockwave-filter`});super({gpuProgram:r,glProgram:i,resources:{shockwaveUniforms:{uTime:{value:n.time,type:`f32`},uCenter:{value:n.center,type:`vec2<f32>`},uSpeed:{value:n.speed,type:`f32`},uWave:{value:new Float32Array(4),type:`vec4<f32>`}}}}),aa(this,`uniforms`),aa(this,`time`),this.time=0,this.uniforms=this.resources.shockwaveUniforms.uniforms,Object.assign(this,n)}apply(e,t,n,r){this.uniforms.uTime=this.time,e.applyFilter(this,t,n,r)}get center(){return this.uniforms.uCenter}set center(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uCenter=e}get centerX(){return this.uniforms.uCenter.x}set centerX(e){this.uniforms.uCenter.x=e}get centerY(){return this.uniforms.uCenter.y}set centerY(e){this.uniforms.uCenter.y=e}get speed(){return this.uniforms.uSpeed}set speed(e){this.uniforms.uSpeed=e}get amplitude(){return this.uniforms.uWave[0]}set amplitude(e){this.uniforms.uWave[0]=e}get wavelength(){return this.uniforms.uWave[1]}set wavelength(e){this.uniforms.uWave[1]=e}get brightness(){return this.uniforms.uWave[2]}set brightness(e){this.uniforms.uWave[2]=e}get radius(){return this.uniforms.uWave[3]}set radius(e){this.uniforms.uWave[3]=e}};aa(oa,`DEFAULT_OPTIONS`,{center:{x:0,y:0},speed:500,amplitude:30,wavelength:160,brightness:1,radius:-1});var sa=oa,ca=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uBlur;
uniform vec2 uStart;
uniform vec2 uEnd;
uniform vec2 uDelta;
uniform vec4 uInputSize;

float random(vec3 scale, float seed)
{
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main(void)
{
    vec4 color = vec4(0.0);
    float total = 0.0;

    float blur = uBlur[0];
    float gradientBlur = uBlur[1];

    float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
    vec2 normal = normalize(vec2(uStart.y - uEnd.y, uEnd.x - uStart.x));
    float radius = smoothstep(0.0, 1.0, abs(dot(vTextureCoord * uInputSize.xy - uStart, normal)) / gradientBlur) * blur;

    for (float t = -30.0; t <= 30.0; t++)
    {
        float percent = (t + offset - 0.5) / 30.0;
        float weight = 1.0 - abs(percent);
        vec4 sample = texture(uTexture, vTextureCoord + uDelta / uInputSize.xy * percent * radius);
        sample.rgb *= sample.a;
        color += sample * weight;
        total += weight;
    }

    color /= total;
    color.rgb /= color.a + 0.00001;

    finalColor = color;
}
`,la=`struct TiltShiftUniforms {
  uBlur: vec2<f32>,
  uStart: vec2<f32>,
  uEnd: vec2<f32>,
  uDelta: vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> tiltShiftUniforms : TiltShiftUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uBlur = tiltShiftUniforms.uBlur[0];
  let uBlurGradient = tiltShiftUniforms.uBlur[1];
  let uStart = tiltShiftUniforms.uStart;
  let uEnd = tiltShiftUniforms.uEnd;
  let uDelta = tiltShiftUniforms.uDelta;

  var color: vec4<f32> = vec4<f32>(0.0);
  var total: f32 = 0.0;

  let offset: f32 = random(position, vec3<f32>(12.9898, 78.233, 151.7182), 0.0);
  let normal: vec2<f32> = normalize(vec2<f32>(uStart.y - uEnd.y, uEnd.x - uStart.x));
  let radius: f32 = smoothstep(0.0, 1.0, abs(dot(uv * gfu.uInputSize.xy - uStart, normal)) / uBlurGradient) * uBlur;

  for (var t: f32 = -30.0; t <= 30.0; t += 1.0)
  {
    var percent: f32 = (t + offset - 0.5) / 30.0;
    var weight: f32 = 1.0 - abs(percent);
    var sample: vec4<f32> = textureSample(uTexture, uSampler, uv + uDelta / gfu.uInputSize.xy * percent * radius);
    sample = vec4<f32>(sample.xyz * sample.a, sample.a); // multiply sample.rgb with sample.a
    color += sample * weight;
    total += weight;
  }

  color /= total;
  color = vec4<f32>(color.xyz / (color.a + 0.00001), color.a); // divide color.rgb by color.a + 0.00001

  return color;
}


fn random(position: vec4<f32>, scale: vec3<f32>, seed: f32) -> f32
{
  return fract(sin(dot(position.xyz + seed, scale)) * 43758.5453 + seed);
}`,ua=Object.defineProperty,da=(e,t,n)=>t in e?ua(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,fa=(e,t,n)=>(da(e,typeof t==`symbol`?t:t+``,n),n),pa=class e extends b{constructor(t){let{width:n,height:r}=se.defaultOptions;t={...e.DEFAULT_OPTIONS,start:{x:0,y:r/2},end:{x:n,y:r/2},...t};let i=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:la,entryPoint:`mainFragment`}}),a=_.from({vertex:j,fragment:ca,name:`tilt-shift-axis-filter`});super({gpuProgram:i,glProgram:a,resources:{tiltShiftUniforms:{uBlur:{value:new Float32Array([t.blur,t.gradientBlur]),type:`vec2<f32>`},uStart:{value:t.start,type:`vec2<f32>`},uEnd:{value:t.end,type:`vec2<f32>`},uDelta:{value:new Float32Array([0,0]),type:`vec2<f32>`}}}}),fa(this,`uniforms`),fa(this,`_tiltAxis`),this.uniforms=this.resources.tiltShiftUniforms.uniforms,this._tiltAxis=t.axis}updateDelta(){if(this.uniforms.uDelta[0]=0,this.uniforms.uDelta[1]=0,this._tiltAxis===void 0)return;let e=this.uniforms.uEnd,t=this.uniforms.uStart,n=e.x-t.x,r=e.y-t.y,i=Math.sqrt(n*n+r*r),a=this._tiltAxis===`vertical`;this.uniforms.uDelta[0]=a?-r/i:n/i,this.uniforms.uDelta[1]=a?n/i:r/i}};fa(pa,`DEFAULT_OPTIONS`,{blur:100,gradientBlur:600});var ma=pa,ha=Object.defineProperty,ga=(e,t,n)=>t in e?ha(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,_a=(e,t,n)=>(ga(e,typeof t==`symbol`?t:t+``,n),n),va=class extends ma{constructor(e){e={...ma.DEFAULT_OPTIONS,...e},super({...e,axis:`horizontal`}),_a(this,`_tiltShiftYFilter`),this._tiltShiftYFilter=new ma({...e,axis:`vertical`}),this.updateDelta(),Object.assign(this,e)}apply(e,t,n,r){let i=y.getSameSizeTexture(t);e.applyFilter(this,t,i,!0),e.applyFilter(this._tiltShiftYFilter,i,n,r),y.returnTexture(i)}updateDelta(){super.updateDelta(),this._tiltShiftYFilter.updateDelta()}get blur(){return this.uniforms.uBlur[0]}set blur(e){this.uniforms.uBlur[0]=this._tiltShiftYFilter.uniforms.uBlur[0]=e}get gradientBlur(){return this.uniforms.uBlur[1]}set gradientBlur(e){this.uniforms.uBlur[1]=this._tiltShiftYFilter.uniforms.uBlur[1]=e}get start(){return this.uniforms.uStart}set start(e){this.uniforms.uStart=this._tiltShiftYFilter.uniforms.uStart=e,this.updateDelta()}get startX(){return this.start.x}set startX(e){this.start.x=e,this.updateDelta()}get startY(){return this.start.y}set startY(e){this.start.y=e,this.updateDelta()}get end(){return this.uniforms.uEnd}set end(e){this.uniforms.uEnd=this._tiltShiftYFilter.uniforms.uEnd=e,this.updateDelta()}get endX(){return this.end.x}set endX(e){this.end.x=e,this.updateDelta()}get endY(){return this.end.y}set endY(e){this.end.y=e,this.updateDelta()}},ya=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uTwist;
uniform vec2 uOffset;
uniform vec4 uInputSize;

vec2 mapCoord( vec2 coord )
{
    coord *= uInputSize.xy;
    coord += uInputSize.zw;

    return coord;
}

vec2 unmapCoord( vec2 coord )
{
    coord -= uInputSize.zw;
    coord /= uInputSize.xy;

    return coord;
}

vec2 twist(vec2 coord)
{
    coord -= uOffset;

    float dist = length(coord);
    float uRadius = uTwist[0];
    float uAngle = uTwist[1];

    if (dist < uRadius)
    {
        float ratioDist = (uRadius - dist) / uRadius;
        float angleMod = ratioDist * ratioDist * uAngle;
        float s = sin(angleMod);
        float c = cos(angleMod);
        coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);
    }

    coord += uOffset;

    return coord;
}

void main(void)
{
    vec2 coord = mapCoord(vTextureCoord);
    coord = twist(coord);
    coord = unmapCoord(coord);
    finalColor = texture(uTexture, coord);
}
`,ba=`struct TwistUniforms {
  uTwist:vec2<f32>,
  uOffset:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> twistUniforms : TwistUniforms;

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @builtin(position) position: vec4<f32>
) -> @location(0) vec4<f32> {
  return textureSample(uTexture, uSampler, unmapCoord(twist(mapCoord(uv))));
}

fn mapCoord(coord: vec2<f32> ) -> vec2<f32>
{
  var mappedCoord: vec2<f32> = coord;
  mappedCoord *= gfu.uInputSize.xy;
  mappedCoord += gfu.uOutputFrame.xy;
  return mappedCoord;
}

fn unmapCoord(coord: vec2<f32> ) -> vec2<f32>
{
  var mappedCoord: vec2<f32> = coord;
  mappedCoord -= gfu.uOutputFrame.xy;
  mappedCoord /= gfu.uInputSize.xy;
  return mappedCoord;
}

fn twist(coord: vec2<f32>) -> vec2<f32>
{
  var twistedCoord: vec2<f32> = coord;
  let uRadius = twistUniforms.uTwist[0];
  let uAngle = twistUniforms.uTwist[1];
  let uOffset = twistUniforms.uOffset;

  twistedCoord -= uOffset;
  
  let dist = length(twistedCoord);

  if (dist < uRadius)
  {
    let ratioDist: f32 = (uRadius - dist) / uRadius;
    let angleMod: f32 = ratioDist * ratioDist * uAngle;
    let s: f32 = sin(angleMod);
    let c: f32 = cos(angleMod);
    twistedCoord = vec2<f32>(twistedCoord.x * c - twistedCoord.y * s, twistedCoord.x * s + twistedCoord.y * c);
  }

  twistedCoord += uOffset;
  return twistedCoord;
}
`,xa=Object.defineProperty,Sa=(e,t,n)=>t in e?xa(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Ca=(e,t,n)=>(Sa(e,typeof t==`symbol`?t:t+``,n),n),wa=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:ba,entryPoint:`mainFragment`}}),r=_.from({vertex:j,fragment:ya,name:`twist-filter`});super({gpuProgram:n,glProgram:r,resources:{twistUniforms:{uTwist:{value:[t.radius??0,t.angle??0],type:`vec2<f32>`},uOffset:{value:t.offset,type:`vec2<f32>`}}},...t}),Ca(this,`uniforms`),this.uniforms=this.resources.twistUniforms.uniforms}get radius(){return this.uniforms.uTwist[0]}set radius(e){this.uniforms.uTwist[0]=e}get angle(){return this.uniforms.uTwist[1]}set angle(e){this.uniforms.uTwist[1]=e}get offset(){return this.uniforms.uOffset}set offset(e){this.uniforms.uOffset=e}get offsetX(){return this.offset.x}set offsetX(e){this.offset.x=e}get offsetY(){return this.offset.y}set offsetY(e){this.offset.y=e}};Ca(wa,`DEFAULT_OPTIONS`,{padding:20,radius:200,angle:4,offset:{x:0,y:0}});var Ta=wa,Ea=`precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uStrength;
uniform vec2 uCenter;
uniform vec2 uRadii;

uniform vec4 uInputSize;

const float MAX_KERNEL_SIZE = \${MAX_KERNEL_SIZE};

// author: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand(vec2 co, float seed) {
    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
    highp float dt = dot(co + seed, vec2(a, b)), sn = mod(dt, 3.14159);
    return fract(sin(sn) * c + seed);
}

void main() {
    float minGradient = uRadii[0] * 0.3;
    float innerRadius = (uRadii[0] + minGradient * 0.5) / uInputSize.x;

    float gradient = uRadii[1] * 0.3;
    float radius = (uRadii[1] - gradient * 0.5) / uInputSize.x;

    float countLimit = MAX_KERNEL_SIZE;

    vec2 dir = vec2(uCenter.xy / uInputSize.xy - vTextureCoord);
    float dist = length(vec2(dir.x, dir.y * uInputSize.y / uInputSize.x));

    float strength = uStrength;

    float delta = 0.0;
    float gap;
    if (dist < innerRadius) {
        delta = innerRadius - dist;
        gap = minGradient;
    } else if (radius >= 0.0 && dist > radius) { // radius < 0 means it's infinity
        delta = dist - radius;
        gap = gradient;
    }

    if (delta > 0.0) {
        float normalCount = gap / uInputSize.x;
        delta = (normalCount - delta) / normalCount;
        countLimit *= delta;
        strength *= delta;
        if (countLimit < 1.0)
        {
            gl_FragColor = texture(uTexture, vTextureCoord);
            return;
        }
    }

    // randomize the lookup values to hide the fixed number of samples
    float offset = rand(vTextureCoord, 0.0);

    float total = 0.0;
    vec4 color = vec4(0.0);

    dir *= strength;

    for (float t = 0.0; t < MAX_KERNEL_SIZE; t++) {
        float percent = (t + offset) / MAX_KERNEL_SIZE;
        float weight = 4.0 * (percent - percent * percent);
        vec2 p = vTextureCoord + dir * percent;
        vec4 sample = texture(uTexture, p);

        // switch to pre-multiplied alpha to correctly blur transparent images
        // sample.rgb *= sample.a;

        color += sample * weight;
        total += weight;

        if (t > countLimit){
            break;
        }
    }

    color /= total;
    // switch back from pre-multiplied alpha
    // color.rgb /= color.a + 0.00001;

    gl_FragColor = color;
}
`,Da=`struct ZoomBlurUniforms {
    uStrength:f32,
    uCenter:vec2<f32>,
    uRadii:vec2<f32>,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> zoomBlurUniforms : ZoomBlurUniforms;

@fragment
fn mainFragment(
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let uStrength = zoomBlurUniforms.uStrength;
  let uCenter = zoomBlurUniforms.uCenter;
  let uRadii = zoomBlurUniforms.uRadii;

  let minGradient: f32 = uRadii[0] * 0.3;
  let innerRadius: f32 = (uRadii[0] + minGradient * 0.5) / gfu.uInputSize.x;

  let gradient: f32 = uRadii[1] * 0.3;
  let radius: f32 = (uRadii[1] - gradient * 0.5) / gfu.uInputSize.x;

  let MAX_KERNEL_SIZE: f32 = \${MAX_KERNEL_SIZE};

  var countLimit: f32 = MAX_KERNEL_SIZE;

  var dir: vec2<f32> = vec2<f32>(uCenter / gfu.uInputSize.xy - uv);
  let dist: f32 = length(vec2<f32>(dir.x, dir.y * gfu.uInputSize.y / gfu.uInputSize.x));

  var strength: f32 = uStrength;

  var delta: f32 = 0.0;
  var gap: f32;

  if (dist < innerRadius) {
      delta = innerRadius - dist;
      gap = minGradient;
  } else if (radius >= 0.0 && dist > radius) { // radius < 0 means it's infinity
      delta = dist - radius;
      gap = gradient;
  }

  var returnColorOnly: bool = false;

  if (delta > 0.0) {
    let normalCount: f32 = gap / gfu.uInputSize.x;
    delta = (normalCount - delta) / normalCount;
    countLimit *= delta;
    strength *= delta;
    
    if (countLimit < 1.0)
    {
      returnColorOnly = true;;
    }
  }

  // randomize the lookup values to hide the fixed number of samples
  let offset: f32 = rand(uv, 0.0);

  var total: f32 = 0.0;
  var color: vec4<f32> = vec4<f32>(0.);

  dir *= strength;

  for (var t = 0.0; t < MAX_KERNEL_SIZE; t += 1.0) {
    let percent: f32 = (t + offset) / MAX_KERNEL_SIZE;
    let weight: f32 = 4.0 * (percent - percent * percent);
    let p: vec2<f32> = uv + dir * percent;
    let sample: vec4<f32> = textureSample(uTexture, uSampler, p);
    
    if (t < countLimit)
    {
      color += sample * weight;
      total += weight;
    }
  }

  color /= total;

  return select(color, textureSample(uTexture, uSampler, uv), returnColorOnly);
}

fn modulo(x: f32, y: f32) -> f32
{
  return x - y * floor(x/y);
}

// author: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
fn rand(co: vec2<f32>, seed: f32) -> f32
{
  let a: f32 = 12.9898;
  let b: f32 = 78.233;
  let c: f32 = 43758.5453;
  let dt: f32 = dot(co + seed, vec2<f32>(a, b));
  let sn: f32 = modulo(dt, 3.14159);
  return fract(sin(sn) * c + seed);
}`,Oa=Object.defineProperty,ka=(e,t,n)=>t in e?Oa(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,Aa=(e,t,n)=>(ka(e,typeof t==`symbol`?t:t+``,n),n),ja=class e extends b{constructor(t){t={...e.DEFAULT_OPTIONS,...t};let n=t.maxKernelSize??32,r=S.from({vertex:{source:M,entryPoint:`mainVertex`},fragment:{source:Da.replace("${MAX_KERNEL_SIZE}",n.toFixed(1)),entryPoint:`mainFragment`}}),i=_.from({vertex:j,fragment:Ea.replace("${MAX_KERNEL_SIZE}",n.toFixed(1)),name:`zoom-blur-filter`});super({gpuProgram:r,glProgram:i,resources:{zoomBlurUniforms:{uStrength:{value:t.strength,type:`f32`},uCenter:{value:{x:0,y:0},type:`vec2<f32>`},uRadii:{value:new Float32Array(2),type:`vec2<f32>`}}}}),Aa(this,`uniforms`),this.uniforms=this.resources.zoomBlurUniforms.uniforms,Object.assign(this,t)}get strength(){return this.uniforms.uStrength}set strength(e){this.uniforms.uStrength=e}get center(){return this.uniforms.uCenter}set center(e){Array.isArray(e)&&(e={x:e[0],y:e[1]}),this.uniforms.uCenter=e}get centerX(){return this.uniforms.uCenter.x}set centerX(e){this.uniforms.uCenter.x=e}get centerY(){return this.uniforms.uCenter.y}set centerY(e){this.uniforms.uCenter.y=e}get innerRadius(){return this.uniforms.uRadii[0]}set innerRadius(e){this.uniforms.uRadii[0]=e}get radius(){return this.uniforms.uRadii[1]}set radius(e){this.uniforms.uRadii[1]=e<0||e===1/0?-1:e}};Aa(ja,`DEFAULT_OPTIONS`,{strength:.1,center:{x:0,y:0},innerRadius:0,radius:-1,maxKernelSize:32});var Ma=ja,Na=`#version 300 es
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec4 uOutputFrame;

// 0..1 across the filtered area, whatever size pixi picked for the texture
vec2 frameUv() {
  return vTextureCoord * uInputSize.xy / uOutputFrame.zw;
}
vec2 frameToTex(vec2 uv) {
  return clamp(uv * uOutputFrame.zw * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);
}
float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}
`,V=class extends b{uniforms;constructor(e,t,n){super({glProgram:_.from({vertex:ce,fragment:Na+t,name:e}),resources:{effectUniforms:n}}),this.uniforms=this.resources.effectUniforms.uniforms}};function H(e){return{value:e,type:`f32`}}function U(e,t,n){return{value:new Float32Array([e,t,n]),type:`vec3<f32>`}}function Pa(e,...t){for(let n=0;n<t.length;n++)e[n]=t[n]}var Fa=`
uniform vec3 uKeyColor;
uniform float uTolerance;
uniform float uSoftness;
uniform float uSpill;
uniform float uEdgeThin;
uniform float uFeather;

vec2 chroma(vec3 c) {
  return vec2(
    -0.1146 * c.r - 0.3854 * c.g + 0.5 * c.b,
    0.5 * c.r - 0.4542 * c.g - 0.0458 * c.b
  );
}

float keyAlpha(vec3 c) {
  float d = distance(chroma(c), chroma(uKeyColor));
  float a = smoothstep(uTolerance, uTolerance + uSoftness + 0.001, d);
  // edge thin shifts the matte in or out before it gets clamped
  a = clamp(a + uEdgeThin * (a - 0.5) * 2.0 * step(0.001, a) * step(a, 0.999), 0.0, 1.0);
  return a;
}

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.0) { finalColor = src; return; }
  vec3 c = src.rgb / src.a;
  float a = keyAlpha(c);

  if (uFeather > 0.0) {
    vec2 px = uInputSize.zw * uFeather;
    float sum = a;
    sum += keyAlpha(texture(uTexture, clamp(vTextureCoord + vec2(px.x, 0.0), uInputClamp.xy, uInputClamp.zw)).rgb);
    sum += keyAlpha(texture(uTexture, clamp(vTextureCoord - vec2(px.x, 0.0), uInputClamp.xy, uInputClamp.zw)).rgb);
    sum += keyAlpha(texture(uTexture, clamp(vTextureCoord + vec2(0.0, px.y), uInputClamp.xy, uInputClamp.zw)).rgb);
    sum += keyAlpha(texture(uTexture, clamp(vTextureCoord - vec2(0.0, px.y), uInputClamp.xy, uInputClamp.zw)).rgb);
    a = sum / 5.0;
  }

  // spill: pull the key hue back towards the other two channels
  vec3 k = uKeyColor;
  float dominant = k.g >= max(k.r, k.b) ? 1.0 : 0.0;
  if (dominant > 0.5) {
    float limit = mix(c.g, (c.r + c.b) * 0.5, uSpill);
    c.g = min(c.g, max(limit, min(c.r, c.b)));
  } else if (k.b >= k.r) {
    float limit = mix(c.b, (c.r + c.g) * 0.5, uSpill);
    c.b = min(c.b, max(limit, min(c.r, c.g)));
  } else {
    float limit = mix(c.r, (c.g + c.b) * 0.5, uSpill);
    c.r = min(c.r, max(limit, min(c.g, c.b)));
  }

  float outA = src.a * a;
  finalColor = vec4(c * outA, outA);
}
`,Ia=class extends V{constructor(){super(`chroma-key`,Fa,{uKeyColor:U(0,1,0),uTolerance:H(.25),uSoftness:H(.1),uSpill:H(.5),uEdgeThin:H(0),uFeather:H(0)})}},La=`
uniform vec3 uShadows;
uniform vec3 uMidtones;
uniform vec3 uHighlights;
uniform float uPreserveLuma;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.0) { finalColor = src; return; }
  vec3 c = src.rgb / src.a;
  float l = luma(c);
  float shadowW = 1.0 - smoothstep(0.0, 0.5, l);
  float highW = smoothstep(0.5, 1.0, l);
  float midW = 1.0 - shadowW - highW;
  vec3 adjusted = c + uShadows * shadowW * 0.5 + uMidtones * midW * 0.5 + uHighlights * highW * 0.5;
  adjusted = clamp(adjusted, 0.0, 1.0);
  if (uPreserveLuma > 0.5) {
    float nl = luma(adjusted);
    adjusted = clamp(adjusted + (l - nl), 0.0, 1.0);
  }
  finalColor = vec4(adjusted * src.a, src.a);
}
`,Ra=class extends V{constructor(){super(`color-balance`,La,{uShadows:U(0,0,0),uMidtones:U(0,0,0),uHighlights:U(0,0,0),uPreserveLuma:H(1)})}},za=`
uniform float uExposure;
uniform float uContrast;
uniform float uHighlights;
uniform float uShadows;
uniform float uWhites;
uniform float uBlacks;
uniform float uTemperature;
uniform float uTint;
uniform float uSaturation;
uniform float uVibrance;

vec3 toLinear(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 toGamma(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.0) { finalColor = src; return; }
  vec3 c = toLinear(src.rgb / src.a);

  c *= exp2(uExposure);

  // white balance as channel gains, warm pushes red up and blue down
  c.r *= 1.0 + uTemperature * 0.25;
  c.b *= 1.0 - uTemperature * 0.25;
  c.g *= 1.0 - uTint * 0.2;
  c.rb *= 1.0 + uTint * 0.08;

  float l = luma(c);
  float shadowW = 1.0 - smoothstep(0.0, 0.45, l);
  float highW = smoothstep(0.35, 1.0, l);
  c *= 1.0 + uShadows * 0.6 * shadowW;
  c *= 1.0 + uHighlights * 0.6 * highW;

  float whiteW = smoothstep(0.6, 1.0, l);
  float blackW = 1.0 - smoothstep(0.0, 0.2, l);
  c = c * (1.0 + uWhites * 0.4 * whiteW) + uBlacks * 0.08 * blackW;

  c = toGamma(c);

  c = (c - 0.5) * (1.0 + uContrast) + 0.5;

  float gray = luma(c);
  float maxc = max(c.r, max(c.g, c.b));
  float minc = min(c.r, min(c.g, c.b));
  float sat = maxc - minc;
  // vibrance pushes the dull pixels more than the ones already saturated
  c = mix(vec3(gray), c, 1.0 + uSaturation + uVibrance * (1.0 - sat));

  c = clamp(c, 0.0, 1.0);
  finalColor = vec4(c * src.a, src.a);
}
`,Ba=class extends V{constructor(){super(`color-correction`,za,{uExposure:H(0),uContrast:H(0),uHighlights:H(0),uShadows:H(0),uWhites:H(0),uBlacks:H(0),uTemperature:H(0),uTint:H(0),uSaturation:H(0),uVibrance:H(0)})}},Va=`
uniform float uInputBlack;
uniform float uInputWhite;
uniform float uGamma;
uniform float uOutputBlack;
uniform float uOutputWhite;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.0) { finalColor = src; return; }
  vec3 c = src.rgb / src.a;
  c = clamp((c - uInputBlack) / max(uInputWhite - uInputBlack, 0.001), 0.0, 1.0);
  c = pow(c, vec3(1.0 / uGamma));
  c = uOutputBlack + c * (uOutputWhite - uOutputBlack);
  finalColor = vec4(clamp(c, 0.0, 1.0) * src.a, src.a);
}
`,Ha=class extends V{constructor(){super(`levels`,Va,{uInputBlack:H(0),uInputWhite:H(1),uGamma:H(1),uOutputBlack:H(0),uOutputWhite:H(1)})}},Ua=`
uniform float uThreshold;
uniform float uSoftness;
uniform float uInvert;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.0) { finalColor = src; return; }
  float l = luma(src.rgb / src.a);
  float a = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness + 0.001, l);
  a = mix(a, 1.0 - a, uInvert);
  finalColor = src * a;
}
`,Wa=class extends V{constructor(){super(`luma-key`,Ua,{uThreshold:H(.2),uSoftness:H(.1),uInvert:H(0)})}},Ga=`
uniform float uAxis;
uniform float uCenter;

void main() {
  vec2 uv = frameUv();
  if (uAxis < 0.5) {
    if (uv.x > uCenter) uv.x = 2.0 * uCenter - uv.x;
  } else if (uAxis < 1.5) {
    if (uv.x < uCenter) uv.x = 2.0 * uCenter - uv.x;
  } else if (uAxis < 2.5) {
    if (uv.y > uCenter) uv.y = 2.0 * uCenter - uv.y;
  } else {
    if (uv.y < uCenter) uv.y = 2.0 * uCenter - uv.y;
  }
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    finalColor = vec4(0.0);
    return;
  }
  finalColor = texture(uTexture, frameToTex(uv));
}
`,Ka=class extends V{constructor(){super(`mirror`,Ga,{uAxis:H(0),uCenter:H(.5)})}},qa=`
uniform float uLevels;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  if (src.a <= 0.0) { finalColor = src; return; }
  vec3 c = src.rgb / src.a;
  float steps = max(uLevels - 1.0, 1.0);
  c = floor(c * steps + 0.5) / steps;
  finalColor = vec4(c * src.a, src.a);
}
`,Ja=class extends V{constructor(){super(`posterize`,qa,{uLevels:H(6)})}},Ya=`
uniform float uAmount;
uniform float uMidpoint;
uniform float uRoundness;
uniform float uFeather;
uniform vec3 uColor;

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  vec2 uv = frameUv() - 0.5;
  float aspect = uOutputFrame.z / uOutputFrame.w;
  vec2 circle = uv * vec2(aspect, 1.0);
  vec2 ellipse = uv;
  vec2 p = mix(ellipse, circle, clamp(uRoundness, 0.0, 1.0));
  float d;
  if (uRoundness < 0.0) {
    // superellipse, the corners get squarer the further down you go
    float n = mix(2.0, 8.0, -uRoundness);
    d = pow(pow(abs(p.x * 2.0), n) + pow(abs(p.y * 2.0), n), 1.0 / n) * 0.5;
  } else {
    d = length(p);
  }
  float inner = uMidpoint * 0.75;
  float outer = inner + max(uFeather, 0.001) * 0.75;
  float v = smoothstep(inner, outer, d) * uAmount;
  finalColor = vec4(mix(src.rgb, uColor * src.a, v), src.a);
}
`,Xa=class extends V{constructor(){super(`vignette`,Ya,{uAmount:H(.5),uMidpoint:H(.5),uRoundness:H(0),uFeather:H(.5),uColor:U(0,0,0)})}},W,Za=new Map,Qa=new Set;function $a(){if(W&&!W.isContextLost())return W;if(W===null)return null;try{let e=document.createElement(`canvas`);e.width=1,e.height=1,W=e.getContext(`webgl2`,{alpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`})}catch{W=null}return W??null}function eo(e,t,n){let r=e.createShader(t);if(!r)return`no shader object`;e.shaderSource(r,n),e.compileShader(r);let i=e.getShaderParameter(r,e.COMPILE_STATUS)?null:(e.getShaderInfoLog(r)||`compile failed`).trim();return e.deleteShader(r),i}function to(e,t){let n=`${e.length}:${t}`,r=Za.get(n);if(r!==void 0)return r;let i=$a();if(!i)return Za.set(n,null),null;let a=eo(i,i.FRAGMENT_SHADER,t)??eo(i,i.VERTEX_SHADER,e);return Za.set(n,a),a}function no(e,t){let n=e.glProgram;if(!n?.fragment||!n.vertex)return!0;let r=to(n.vertex,n.fragment);return!r||(Qa.has(t)||(Qa.add(t),console.warn(`[braincut] ${t} does not compile here, falling back:\n${r}`)),!1)}function G(e,t,n=0){let r=e[t];return typeof r==`number`&&Number.isFinite(r)?r:n}function K(e,t,n,r){return G(e,t,n)*r.scale}function q(e,t,n=!1){let r=e[t];return typeof r==`boolean`?r:n}function ro(e,t,n=``){let r=e[t];return typeof r==`string`?r:n}function J(e,t){let n=e[t];return Array.isArray(n)?[n[0],n[1]]:[0,0]}function io(e){return e*Math.PI/180}function ao(e,t=0){let n=/^#?([0-9a-f]{6})$/i.exec(e);return n?parseInt(n[1],16):t}function oo(e,t=0){let n=ao(e,t);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]}function Y(e,t,n=0){return ao(ro(e,t),n)}function so(e,t,n=0){return oo(ro(e,t),n)}function co(e,t,n){let[r,i]=J(e,t);return{x:(n.width/2+r)*n.scale,y:(n.height/2+i)*n.scale}}function lo(e){let t=Math.floor(e.time*e.fps),n=Math.sin(t*12.9898+78.233)*43758.5453;return n-Math.floor(n)}var uo=[1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0];function fo(e,t,n){return e.map((e,r)=>e+(t[r]-e)*n)}function X(e,t){return{filter:e,update:(n,r)=>t(e,n,r),destroy:()=>e.destroy()}}var po={low:2,medium:4,high:8},mo={"gaussian-blur":()=>X(new Yt({strength:10,quality:4}),(e,t,n)=>{e.strength=K(t,`strength`,10,n),e.quality=po[ro(t,`quality`,`medium`)]??4}),"directional-blur":()=>X(new _i,(e,t,n)=>{let r=io(G(t,`angle`)),i=K(t,`distance`,20,n);e.velocity={x:Math.cos(r)*i,y:Math.sin(r)*i},e.kernelSize=Math.min(25,Math.max(5,Math.round(i/4)*2+1))}),"radial-blur":()=>X(new Bi,(e,t,n)=>{e.angle=G(t,`angle`,15),e.center=co(t,`center`,n);let r=K(t,`radius`,0,n);e.radius=r>0?r:-1,e.kernelSize=Math.max(3,Math.round(G(t,`quality`,9))|1)}),"zoom-blur":()=>X(new Ma,(e,t,n)=>{e.strength=G(t,`strength`,10)/100,e.center=co(t,`center`,n),e.innerRadius=K(t,`innerRadius`,0,n),e.radius=-1}),sharpen:()=>X(new hr,(e,t,n)=>{let r=G(t,`amount`,30)/100;e.matrix=[0,-r,0,-r,1+4*r,-r,0,-r,0],e.width=n.width*n.scale,e.height=n.height*n.scale}),"tilt-shift":()=>X(new va,(e,t,n)=>{e.blur=K(t,`blur`,20,n),e.gradientBlur=K(t,`gradient`,300,n);let r=n.height*n.scale;e.start={x:0,y:r*G(t,`start`,50)/100},e.end={x:n.width*n.scale,y:r*G(t,`end`,50)/100}}),"color-correction":()=>X(new Ba,(e,t)=>{let n=e.uniforms;n.uExposure=G(t,`exposure`),n.uContrast=G(t,`contrast`)/100,n.uHighlights=G(t,`highlights`)/100,n.uShadows=G(t,`shadows`)/100,n.uWhites=G(t,`whites`)/100,n.uBlacks=G(t,`blacks`)/100,n.uTemperature=G(t,`temperature`)/100,n.uTint=G(t,`tint`)/100,n.uSaturation=G(t,`saturation`)/100,n.uVibrance=G(t,`vibrance`)/100}),"brightness-contrast":()=>X(new A,(e,t)=>{e.reset(),e.brightness(1+G(t,`brightness`)/100,!1),e.contrast(G(t,`contrast`)/100,!0)}),"hue-saturation":()=>X(new ui,(e,t)=>{e.hue=G(t,`hue`),e.saturation=G(t,`saturation`)/100,e.lightness=G(t,`lightness`)/100,e.colorize=q(t,`colorize`)}),levels:()=>X(new Ha,(e,t)=>{let n=e.uniforms;n.uInputBlack=G(t,`inputBlack`)/255,n.uInputWhite=G(t,`inputWhite`,255)/255,n.uGamma=Math.max(.01,G(t,`gamma`,1)),n.uOutputBlack=G(t,`outputBlack`)/255,n.uOutputWhite=G(t,`outputWhite`,255)/255}),"black-white":()=>X(new A,(e,t)=>{e.reset(),e.saturate(-G(t,`amount`,100)/100,!1)}),invert:()=>X(new A,(e,t)=>{let n=G(t,`amount`,100)/100,r=1-2*n;e.matrix=[r,0,0,0,n,0,r,0,0,n,0,0,r,0,n,0,0,0,1,0]}),tint:()=>X(new A,(e,t)=>{let[n,r,i]=so(t,`black`,0),[a,o,s]=so(t,`white`,16777215),c=G(t,`amount`,100)/100,l=(e,t)=>[.2126*(t-e),.7152*(t-e),.0722*(t-e),0,e];e.matrix=fo(uo,[...l(n,a),...l(r,o),...l(i,s),0,0,0,1,0],c)}),sepia:()=>X(new A,(e,t)=>{e.reset(),e.sepia(!1),e.matrix=fo(uo,e.matrix,G(t,`amount`,100)/100)}),"color-balance":()=>X(new Ra,(e,t)=>{let n=e.uniforms;Pa(n.uShadows,G(t,`shadowRed`)/100,G(t,`shadowGreen`)/100,G(t,`shadowBlue`)/100),Pa(n.uMidtones,G(t,`midtoneRed`)/100,G(t,`midtoneGreen`)/100,G(t,`midtoneBlue`)/100),Pa(n.uHighlights,G(t,`highlightRed`)/100,G(t,`highlightGreen`)/100,G(t,`highlightBlue`)/100),n.uPreserveLuma=+!!q(t,`preserveLuminosity`,!0)}),"chroma-key":()=>X(new Ia,(e,t)=>{let n=e.uniforms;Pa(n.uKeyColor,...so(t,`color`,65280)),n.uTolerance=G(t,`tolerance`,25)/100*.6,n.uSoftness=G(t,`softness`,10)/100*.6,n.uSpill=G(t,`spill`,50)/100,n.uEdgeThin=G(t,`edgeThin`)/100,n.uFeather=G(t,`feather`)/100*8}),"luma-key":()=>X(new Wa,(e,t)=>{let n=e.uniforms;n.uThreshold=G(t,`threshold`,20)/100,n.uSoftness=G(t,`softness`,10)/100,n.uInvert=+!!q(t,`invert`)}),vignette:()=>X(new Xa,(e,t)=>{let n=e.uniforms;n.uAmount=G(t,`amount`,50)/100,n.uMidpoint=G(t,`midpoint`,50)/100,n.uRoundness=G(t,`roundness`)/100,n.uFeather=G(t,`feather`,50)/100,Pa(n.uColor,...so(t,`color`,0))}),posterize:()=>X(new Ja,(e,t)=>{e.uniforms.uLevels=Math.max(2,Math.round(G(t,`levels`,6)))}),pixelate:()=>X(new Ni,(e,t,n)=>{e.size=Math.max(1,K(t,`size`,10,n))}),noise:()=>X(new tn,(e,t,n)=>{e.noise=G(t,`amount`,20)/100,e.seed=q(t,`animated`,!0)?lo(n):.5}),glitch:()=>{let e=new Xr({slices:6,offset:60}),t=-1;return X(e,(e,n,r)=>{let i=Math.max(2,Math.round(G(n,`slices`,6)));e.slices!==i&&(e.slices=i),e.offset=K(n,`offset`,60,r),e.direction=G(n,`direction`);let a=G(n,`colorShift`,20)/100*10*r.scale;e.red={x:a,y:0},e.green={x:-a,y:0},e.blue={x:0,y:a};let o=q(n,`animated`,!0)?Math.floor(r.time*8):0;o!==t&&(t=o,e.seed=lo(r),e.refresh())})},"rgb-split":()=>X(new ea,(e,t,n)=>{let r=([e,t])=>({x:e*n.scale,y:t*n.scale});e.red=r(J(t,`red`)),e.green=r(J(t,`green`)),e.blue=r(J(t,`blue`))}),emboss:()=>X(new Wr,(e,t)=>{e.strength=G(t,`strength`,5)}),"dot-screen":()=>X(new Mr,(e,t)=>{e.scale=G(t,`scale`,1),e.angle=io(G(t,`angle`,5)),e.grayscale=q(t,`grayscale`,!0)}),"cross-hatch":()=>X(new vr,()=>{}),"old-film":()=>X(new wi,(e,t,n)=>{e.sepia=G(t,`sepia`,30)/100,e.noise=G(t,`noise`,30)/100,e.noiseSize=G(t,`noiseSize`,1),e.scratch=G(t,`scratch`,50)/100,e.scratchDensity=G(t,`scratchDensity`,30)/100,e.vignetting=G(t,`vignette`,30)/100,e.seed=lo(n)}),crt:()=>X(new Tr,(e,t,n)=>{e.curvature=G(t,`curvature`,1),e.lineWidth=G(t,`lineWidth`,1),e.lineContrast=G(t,`lineContrast`,25)/100,e.verticalLine=q(t,`verticalLines`),e.noise=G(t,`noise`,30)/100,e.vignetting=G(t,`vignette`,30)/100,e.time=n.time,e.seed=lo(n)}),glow:()=>X(new ri,(e,t,n)=>{e.distance=K(t,`distance`,10,n),e.outerStrength=G(t,`outerStrength`,4),e.innerStrength=G(t,`innerStrength`),e.color=Y(t,`color`,16777215)}),bloom:()=>X(new Cn,(e,t,n)=>{e.threshold=G(t,`threshold`,50)/100,e.bloomScale=G(t,`intensity`,1),e.brightness=G(t,`brightness`,1),e.blur=K(t,`blur`,8,n)}),"drop-shadow":()=>X(new Rr,(e,t,n)=>{let[r,i]=J(t,`offset`);e.offset={x:r*n.scale,y:i*n.scale},e.blur=K(t,`blur`,4,n),e.color=Y(t,`color`,0),e.alpha=G(t,`opacity`,60)/100}),outline:()=>X(new Ai,(e,t,n)=>{e.thickness=K(t,`thickness`,2,n),e.color=Y(t,`color`,16777215),e.alpha=G(t,`opacity`,100)/100}),ascii:()=>X(new An,(e,t,n)=>{e.size=Math.max(2,K(t,`size`,8,n)),e.color=Y(t,`color`,16777215),e.replaceColor=q(t,`replaceColor`)}),mosaic:()=>X(new Ni,(e,t,n)=>{e.size=[Math.max(1,K(t,`width`,16,n)),Math.max(1,K(t,`height`,16,n))]}),twist:()=>X(new Ta,(e,t,n)=>{e.angle=io(G(t,`angle`,90)),e.radius=K(t,`radius`,300,n),e.offset=co(t,`center`,n)}),"bulge-pinch":()=>X(new Ln,(e,t,n)=>{let[r,i]=J(t,`center`);e.center={x:.5+r/n.width,y:.5+i/n.height},e.radius=K(t,`radius`,300,n),e.strength=G(t,`strength`,50)/100}),shockwave:()=>X(new sa,(e,t,n)=>{e.center=co(t,`center`,n),e.speed=K(t,`speed`,500,n),e.amplitude=K(t,`amplitude`,30,n),e.wavelength=K(t,`wavelength`,160,n),e.brightness=G(t,`brightness`,1);let r=K(t,`radius`,0,n);e.radius=r>0?r:-1,e.time=Math.max(0,n.time-G(t,`startTime`))}),reflection:()=>X(new qi,(e,t,n)=>{e.mirror=q(t,`mirror`,!0),e.boundary=G(t,`boundary`,50)/100;let r=K(t,`amplitude`,20,n),i=K(t,`wavelength`,60,n),a=G(t,`opacity`,70)/100;e.amplitude=[r,r*.5],e.waveLength=[i,i*2],e.alpha=[a,a*.7],e.time=n.time*G(t,`speed`,1)}),"lens-distortion":()=>X(new Ln,(e,t,n)=>{e.center={x:.5,y:.5},e.radius=Math.hypot(n.width,n.height)/2*n.scale,e.strength=G(t,`amount`,20)/100}),mirror:()=>X(new Ka,(e,t)=>{let n={vertical:0,"vertical-reverse":1,horizontal:2,"horizontal-reverse":3};e.uniforms.uAxis=n[ro(t,`axis`,`vertical`)]??0,e.uniforms.uCenter=G(t,`center`,50)/100}),"color-overlay":()=>X(new cr,(e,t)=>{e.color=Y(t,`color`,13736550),e.alpha=G(t,`opacity`,50)/100}),"gradient-overlay":()=>{let e=new tr({type:tr.LINEAR,stops:[{offset:0,color:0,alpha:1},{offset:1,color:16777215,alpha:1}]}),t=``;return X(e,(e,n)=>{let r=Y(n,`startColor`,0),i=Y(n,`endColor`,16777215),a=`${r}:${i}`;a!==t&&(t=a,e.stops=[{offset:0,color:r,alpha:1},{offset:1,color:i,alpha:1}]),e.type=ro(n,`shape`,`linear`)===`radial`?tr.RADIAL:tr.LINEAR,e.angle=G(n,`angle`,90),e.alpha=G(n,`opacity`,50)/100})}};function ho(e){let t=mo[e];if(!t)return null;let n=t();return no(n.filter,`effect ${e}`)?n:(n.destroy(),null)}var go=`
uniform float uMode;

const float PQ_M1 = 0.1593017578125;
const float PQ_M2 = 78.84375;
const float PQ_C1 = 0.8359375;
const float PQ_C2 = 18.8515625;
const float PQ_C3 = 18.6875;

// 1.0 comes out as diffuse white, the reference the sdr picture is built on
const float PQ_WHITE = 10000.0 / 203.0;

vec3 pqToLinear(vec3 v) {
  vec3 p = pow(max(v, 0.0), vec3(1.0 / PQ_M2));
  vec3 num = max(p - PQ_C1, 0.0);
  vec3 den = max(PQ_C2 - PQ_C3 * p, 1e-6);
  return pow(num / den, vec3(1.0 / PQ_M1)) * PQ_WHITE;
}

vec3 hlgToLinear(vec3 v) {
  const float a = 0.17883277;
  const float b = 0.28466892;
  const float c = 0.55991073;
  vec3 lo = v * v / 3.0;
  vec3 hi = (exp((v - c) / a) + b) / 12.0;
  vec3 e = mix(lo, hi, step(0.5, v));
  // the display side of hlg, a mild gamma on the luminance
  float y = max(dot(e, vec3(0.2627, 0.6780, 0.0593)), 1e-6);
  return e * pow(y, 0.2) * 4.0;
}

// reinhard with a shoulder, so a 1000 nit highlight still separates
vec3 compress(vec3 c) {
  const float peak = 10.0;
  return c * (1.0 + c / (peak * peak)) / (1.0 + c);
}

vec3 bt2020ToBt709(vec3 c) {
  return vec3(
    dot(c, vec3(1.66049, -0.58764, -0.07285)),
    dot(c, vec3(-0.12455, 1.13290, -0.00835)),
    dot(c, vec3(-0.01825, -0.10058, 1.11883))
  );
}

vec3 srgbEncode(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, 1e-6), vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(0.0031308, c));
}

void main() {
  vec4 src = texture(uTexture, vTextureCoord);
  vec3 lin = uMode < 0.5 ? pqToLinear(src.rgb) : hlgToLinear(src.rgb);
  vec3 out709 = clamp(bt2020ToBt709(compress(lin)), 0.0, 1.0);
  finalColor = vec4(srgbEncode(out709) * src.a, src.a);
}
`,_o=class extends V{constructor(e){super(`tone-map-${e}`,go,{uMode:H(+(e===`hlg`))})}};function vo(e){if(!e)return null;let t=e.toLowerCase();return t===`pq`||t===`smpte2084`||t===`smpte-st-2084`?`pq`:t===`hlg`||t===`arib-std-b67`||t===`aribstdb67`?`hlg`:null}var yo=`#version 300 es
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uFromTexture;
uniform sampler2D uToTexture;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float progress;
uniform float ratio;

vec4 getFromColor(vec2 uv) {
  return texture(uFromTexture, vec2(uv.x, 1.0 - uv.y));
}
vec4 getToColor(vec2 uv) {
  return texture(uToTexture, vec2(uv.x, 1.0 - uv.y));
}
`,bo=`
void main() {
  vec2 uv = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
  finalColor = transition(vec2(uv.x, 1.0 - uv.y));
}
`,xo={FilmBurn:e=>e.replace(/\btexture\s*\(/g,`burnTexture(`)},So=/^\s*(float|int|uint|bool|vec2|vec3|vec4|ivec2|ivec3|ivec4|bvec2|bvec3|bvec4|mat2|mat3|mat4)\s+([A-Za-z_]\w*)\s*=\s*(.+);\s*$/,Co=/^\s*(?:const|uniform|in|out|attribute|varying)\b/;function wo(e){let t=e.split(`
`),n=0;for(let e=0;e<t.length;e++){let r=t[e];if(n===0&&!Co.test(r)){let n=So.exec(r);n&&(t[e]=`${n[1]} ${n[2]}_lifted() { return ${n[3]}; }\n#define ${n[2]} ${n[2]}_lifted()`)}for(let e of r)e===`{`?n++:e===`}`&&n--}return t.join(`
`)}function To(e,t){let n=xo[e]?xo[e](t):t;return n=n.replace(/^\s*precision\s+\w+\s+float\s*;\s*$/gm,``),n=n.replace(/\/\/.*$/gm,``),n=n.replace(/\btexture2D\s*\(/g,`texture(`),n=wo(n),n}function Eo(e,t){return yo+To(e,t)+bo}function Do(e){switch(e){case`float`:return`f32`;case`int`:return`i32`;case`bool`:return`i32`;case`vec2`:return`vec2<f32>`;case`vec3`:return`vec3<f32>`;case`vec4`:return`vec4<f32>`;case`ivec2`:return`vec2<i32>`;default:return null}}function Oo(e,t){let n=Array.isArray(t)?t:[];switch(e){case`float`:return typeof t==`number`?t:0;case`int`:return typeof t==`number`?t:0;case`bool`:return+!!t;case`vec2`:return new Float32Array([n[0]??0,n[1]??0]);case`ivec2`:return new Int32Array([n[0]??0,n[1]??0]);case`vec3`:return new Float32Array([n[0]??0,n[1]??0,n[2]??0]);case`vec4`:return new Float32Array([n[0]??0,n[1]??0,n[2]??0,n[3]??1]);default:return 0}}var ko=class extends b{def;glTypes;uniforms;constructor(e){let t=e.glslId?ve(e.glslId):void 0;if(!t)throw Error(`Transition ${e.id} has no shader`);let n={progress:{value:0,type:`f32`},ratio:{value:1,type:`f32`}},r={};for(let[e,i]of Object.entries(t.paramsTypes)){let a=Do(i);a&&(r[e]=i,n[e]={value:Oo(i,t.defaultParams[e]),type:a})}let i=f.EMPTY.source;super({glProgram:_.from({vertex:ce,fragment:Eo(t.name,t.glsl),name:`transition-${e.id}`}),resources:{transitionUniforms:n,uFromTexture:i,uFromSampler:i.style,uToTexture:i,uToSampler:i.style}}),this.def=e,this.glTypes=r,this.uniforms=this.resources.transitionUniforms.uniforms,this.setParams(e.defaultParams)}setInputs(e,t){this.resources.uFromTexture=e.source,this.resources.uFromSampler=e.source.style,this.resources.uToTexture=t.source,this.resources.uToSampler=t.source.style}clearInputs(){let e=f.EMPTY.source;this.resources.uFromTexture=e,this.resources.uFromSampler=e.style,this.resources.uToTexture=e,this.resources.uToSampler=e.style}set progress(e){this.uniforms.progress=Math.min(1,Math.max(0,e))}get progress(){return this.uniforms.progress}set ratio(e){this.uniforms.ratio=e}get ratio(){return this.uniforms.ratio}setParams(e){for(let[t,n]of Object.entries(this.glTypes)){let r=e[t]??this.def.defaultParams[t];if(r===void 0)continue;let i=this.uniforms[t];switch(n){case`float`:case`int`:typeof r==`number`&&(this.uniforms[t]=n===`int`?Math.round(r):r);break;case`bool`:this.uniforms[t]=+!!r;break;case`vec2`:case`ivec2`:Array.isArray(r)&&typeof i==`object`&&(i[0]=r[0],i[1]=r[1]);break;case`vec3`:case`vec4`:if(typeof r==`string`&&typeof i==`object`){let[e,t,n]=oo(r);i[0]=e,i[1]=t,i[2]=n}}}}},Ao=`cross-dissolve`;function jo(e){let t=Oe(e);if(!t||t.kind!==`video`)return null;let n=null;try{n=new ko(t)}catch(e){console.warn(`[braincut] transition ${t.id} could not be built:`,e)}if(n){if(no(n,`transition ${t.id}`))return n;n.destroy()}return e===Ao?null:jo(Ao)}function Z(e,t){return typeof e==`number`&&Number.isFinite(e)?e:t}function Mo(e,t){return typeof e==`boolean`?e:t}function No(e){return Array.isArray(e)&&e.length===2&&Number.isFinite(e[0])&&Number.isFinite(e[1])?[e[0],e[1]]:[0,0]}function Po(e){let t=e??{};return{position:No(t.position),scale:Z(t.scale,100),scaleY:Z(t.scaleY,100),uniformScale:Mo(t.uniformScale,!0),rotation:Z(t.rotation,0),anchor:No(t.anchor),flipH:Mo(t.flipH,!1),flipV:Mo(t.flipV,!1)}}function Fo(e,t,n,r,i){let a=Math.max(1,t),o=Math.max(1,n),s=a/2+e.anchor[0],c=o/2+e.anchor[1],l=e.scale/100,u=(e.uniformScale?e.scale:e.scaleY)/100;return{x:r/2+e.position[0],y:i/2+e.position[1],scaleX:e.flipH?-l:l,scaleY:e.flipV?-u:u,rotation:e.rotation*Math.PI/180,anchor:{x:s/a,y:c/o},pivot:{x:s,y:c}}}function Io(e,t){return e.width<=0||e.height<=0?100:Math.min(t.width/e.width,t.height/e.height)*100}function Lo(e,t){return e.width<=0||e.height<=0?100:Math.max(t.width/e.width,t.height/e.height)*100}function Ro(e,t,n){let r=e??{},i=e=>Math.min(100,Math.max(0,e)),a=i(Z(r.left,0)),o=i(Z(r.top,0)),s=i(Z(r.right,0)),c=i(Z(r.bottom,0)),l=a/100*t,u=o/100*n;return{x:l,y:u,width:Math.max(0,t-l-s/100*t),height:Math.max(0,n-u-c/100*n)}}function Q(e,t){return t()}async function zo(e,t){return t()}var Bo=1e4,Vo=3804429,Ho=1843238,Uo=3028288,Wo={normal:`normal`,add:`add`,multiply:`multiply`,screen:`screen`,overlay:`overlay`,darken:`darken`,lighten:`lighten`,difference:`difference`,exclusion:`exclusion`,"hard-light":`hard-light`,"soft-light":`soft-light`,"color-dodge":`color-dodge`,"color-burn":`color-burn`},Go=new Set([`overlay`,`darken`,`lighten`,`difference`,`exclusion`,`hard-light`,`soft-light`,`color-dodge`,`color-burn`]);function Ko(e,t){return e.effects.find(e=>e.type===t)}function qo(e){return e!==`audio`}var Jo=class{canvas;ready;width;height;scale;scaleX=1;scaleY=1;renderer=null;root=new C;lost=!1;destroyed=!1;tail=Promise.resolve();effects=new Map;titles=new Map;transitions=new Map;stills=new Map;slates=new Map;toneMaps=new Map;onRecovered;loseContext=null;backBuffer=null;needsBackdrop=!1;rtPool=[];empty=null;side=new C;safeMargins=null;onLost=e=>{if(e.preventDefault(),!this.lost){this.lost=!0;try{this.dropGpuCaches()}catch{}setTimeout(()=>this.requestRestore(),0)}};onRestored=()=>{this.lost=!1;try{this.dropGpuCaches()}catch{}this.onRecovered?.()};requestRestore(){if(!this.destroyed&&this.lost)try{this.loseContext?.restoreContext()}catch{}}get contextLost(){return this.lost}constructor(e){this.onRecovered=e.onRecovered,this.width=Math.max(1,Math.round(e.width)),this.height=Math.max(1,Math.round(e.height)),this.scale=e.scale??1,this.canvas=document.createElement(`canvas`),this.canvas.width=Yo(this.width*this.scale),this.canvas.height=Yo(this.height*this.scale),this.canvas.addEventListener(`webglcontextlost`,this.onLost),this.canvas.addEventListener(`webglcontextrestored`,this.onRestored),this.applyScale(),this.ready=this.init(e.background??0)}async init(e){let t=await Rt({preference:`webgl`,canvas:this.canvas,width:this.canvas.width,height:this.canvas.height,resolution:1,antialias:!1,background:e,backgroundAlpha:1,clearBeforeRender:!0,premultipliedAlpha:!0,preserveDrawingBuffer:!0,useBackBuffer:!0,powerPreference:`high-performance`,gcActive:!1});if(this.destroyed){t.destroy();return}this.renderer=t;let n=t.gl;this.loseContext=n?.getExtension(`WEBGL_lose_context`)??null,this.backBuffer=t.backBuffer??null}setSize(e,t,n){let r=Math.max(1,Math.round(e)),i=Math.max(1,Math.round(t)),a=Math.max(.05,n);if(r===this.width&&i===this.height&&a===this.scale)return;this.width=r,this.height=i,this.scale=a;let o=Yo(r*a),s=Yo(i*a);this.renderer?this.renderer.resize(o,s):(this.canvas.width=o,this.canvas.height=s),this.applyScale(),this.dropTargets();for(let e of this.titles.values())e.view.destroy();this.titles.clear(),this.safeMargins?.destroy(),this.safeMargins=null}applyScale(){this.scaleX=this.canvas.width/this.width,this.scaleY=this.canvas.height/this.height,this.root.scale.set(this.scaleX,this.scaleY)}render(e,t,n){let r=this.tail.then(()=>this.renderFrame(e,t,n));return this.tail=r.catch(()=>{}),r}async renderFrame(e,t,n){await this.ready;let i=this.renderer;if(!i||this.destroyed||this.lost)return;(e.width!==this.width||e.height!==this.height)&&this.setSize(e.width,e.height,this.canvas.width/e.width);let a=[],o=[],s=performance.now();this.needsBackdrop=!1;try{let c=e.tracks.filter(e=>e.kind===`video`&&!e.hidden&&!e.muted),l=c.some(e=>e.solo);for(let u of c){if(l&&!u.solo)continue;let c=this.activeTransition(u,t);if(c){let r=await this.buildTransition(u,c,e,t,n,o,s);r&&(this.root.addChild(r.node),a.push(r.cleanup));continue}let d=r(u,t);if(!d||!d.enabled||!qo(d.kind))continue;if(d.kind===`adjustment`){let n=this.acquireTarget();o.push(n),i.render({container:this.root,target:n,clear:!0,clearColor:[0,0,0,1]}),this.root.removeChildren();let r=new ee(n);r.setSize(this.width,this.height);let c=this.wrapLayer(d,r,this.width,this.height,e,t,s,()=>r.destroy());this.root.addChild(c.node),a.push(c.cleanup);continue}let f=await this.safeClipLayer(d,e,t,n,s);f&&(this.root.addChild(f.node),a.push(f.cleanup))}if(n.showSafeMargins&&n.mode!==`export`&&this.root.addChild(this.safeMarginsOverlay()),this.lost||this.destroyed)return;this.backBuffer&&(this.backBuffer.useBackBuffer=this.needsBackdrop),Q(`draw`,()=>i.render({container:this.root}))}finally{Q(`cleanup`,()=>{this.root.removeChildren();for(let e of a)try{e()}catch{}for(let e of o)this.rtPool.push(e);this.sweep(s)})}}activeTransition(e,t){for(let n of e.transitions)if(t>=n.start&&t<n.start+n.duration){let e=Oe(n.type);return e&&e.kind===`video`?n:null}return null}async buildTransition(e,t,n,r,i,a,o){let s=this.renderer;if(!s)return null;let c=Oe(t.type);if(!c)return null;let l=this.transitions.get(t.id);if(!l||l.type!==t.type){l&&l.filter.destroy();let e=jo(t.type);if(!e)return null;l={type:t.type,filter:e,used:o},this.transitions.set(t.id,l)}l.used=o;let u=t.leftClipId?e.clips.find(e=>e.id===t.leftClipId):void 0,d=t.rightClipId?e.clips.find(e=>e.id===t.rightClipId):void 0,[p,m]=await Promise.all([u&&u.enabled?this.safeClipLayer(u,n,r,i,o):Promise.resolve(null),d&&d.enabled?this.safeClipLayer(d,n,r,i,o):Promise.resolve(null)]);if(this.lost||this.destroyed)return p?.cleanup(),m?.cleanup(),null;let h=e=>{if(!e)return this.emptyTexture();let t=this.acquireTarget();a.push(t);let n=this.side;return n.scale.set(this.scaleX,this.scaleY),n.addChild(e.node),s.render({container:n,target:t,clear:!0,clearColor:[0,0,0,0]}),n.removeChildren(),e.cleanup(),t},[g,_]=Q(`transition`,()=>[h(p),h(m)]),v=l.filter;v.setInputs(g,_);let y=t.duration>0?(r-t.start)/t.duration:1;v.progress=Math.min(1,Math.max(0,y)),v.ratio=this.width/this.height,v.setParams({...c.defaultParams,...t.params});let b=new ee(f.WHITE);return b.setSize(this.width,this.height),b.filters=[v],{node:b,cleanup:()=>{b.filters=[],b.destroy()}}}async safeClipLayer(e,t,n,r,i){try{return await zo(`layer`,()=>this.buildClipLayer(e,t,n,r,i))}catch(a){let o=e.mediaId?r.media(e.mediaId):void 0;o?r.frames.reportUnusable?.(o.id,o.name,a instanceof Error?a.message:String(a)):console.warn(`[braincut] clip ${e.name} could not be drawn:`,a);try{return this.buildSlateLayer(e,t,n,i,`this clip cannot be drawn here`)}catch{return null}}}buildSlateLayer(e,t,n,r,i){let a=this.width,o=this.height,s=`${e.name}|${i}|${a}x${o}`,c=this.slates.get(e.id);if(!c||c.key!==s){c?.view.destroy({children:!0,texture:!0,textureSource:!0});let t=new C;t.addChild(new D().rect(0,0,a,o).fill({color:Ho}));let n=Math.round(Math.min(a,o)*.06);t.addChild(new D().rect(n,n,a-n*2,o-n*2).stroke({color:Uo,width:Math.max(1,Math.round(o/360))}));let l=Math.max(12,Math.round(o/22)),u=new ie({text:e.name,style:{fontFamily:[`Inter`,`sans-serif`],fontSize:l,fill:`#d4d4d8`,align:`center`,wordWrap:!0,wordWrapWidth:a*.8},anchor:.5,resolution:2});u.position.set(a/2,o/2-l*.7);let d=new ie({text:i,style:{fontFamily:[`Inter`,`sans-serif`],fontSize:Math.round(l*.7),fill:`#a1a1aa`,align:`center`,wordWrap:!0,wordWrapWidth:a*.8},anchor:.5,resolution:2});d.position.set(a/2,o/2+l*.7),t.addChild(u),t.addChild(d),c={key:s,view:t,used:r},this.slates.set(e.id,c)}c.used=r;let l=c.view;return this.wrapLayer(e,l,a,o,t,n,r,()=>{l.parent?.removeChild(l)})}async buildClipLayer(e,t,n,r,i){switch(e.kind){case`video`:case`image`:return this.buildMediaLayer(e,t,n,r,i);case`title`:return this.buildTitleLayer(e,t,n,i);case`color`:{let r=new D().rect(0,0,this.width,this.height).fill({color:e.color??`#000000`});return this.wrapLayer(e,r,this.width,this.height,t,n,i,()=>r.destroy())}default:return null}}async buildMediaLayer(e,t,n,r,i){let a=e.mediaId?r.media(e.mediaId):void 0;if(!a||a.status!==`ready`||!a.hasVideo&&a.kind!==`image`){let r=a&&a.width>0?a.width:this.width,o=a&&a.height>0?a.height:this.height,s=new D().rect(0,0,r,o).fill({color:Vo});return this.wrapLayer(e,s,r,o,t,n,i,()=>s.destroy())}if(r.frames.failure?.(a.id))return this.buildSlateLayer(e,t,n,i,`this file can't be decoded here`);let o=nt(e,n,a.duration),s=await zo(`decode`,()=>r.frames.getFrame(a,o,r.mode,e.id));if(!s)return r.frames.failure?.(a.id)?this.buildSlateLayer(e,t,n,i,`this file can't be decoded here`):null;if(this.lost||this.destroyed)return s.release(),null;let c=a.width>0?a.width:s.width,l=a.height>0?a.height:s.height,u=s.rotation??a.rotation,d;try{d=Q(`upload`,()=>this.textureFor(a,s,i))}catch(o){return s.release(),r.frames.reportUnusable?.(a.id,a.name,o instanceof Error?o.message:String(o)),this.buildSlateLayer(e,t,n,i,`this file can't be decoded here`)}let f=new ee(d),p=u===90||u===270;f.setSize(p?l:c,p?c:l),this.placeRotated(f,u,c,l);let m=vo(s.transfer);return m&&(f.filters=[this.toneMap(m)]),this.wrapLayer(e,f,c,l,t,n,i,()=>{f.filters=[],f.destroy(),s.image instanceof ImageBitmap||d.destroy(!0),s.release()})}toneMap(e){let t=this.toneMaps.get(e);return t||(t=new _o(e),this.toneMaps.set(e,t)),t}textureFor(e,t,n){let r=t.image;if(r instanceof ImageBitmap){let t=this.stills.get(e.id);if(t&&t.bitmap===r)return t.used=n,t.texture;t&&t.texture.destroy(!0);let i=new f({source:new E({resource:r,width:r.width,height:r.height,autoGarbageCollect:!1})});return this.stills.set(e.id,{bitmap:r,texture:i,used:n}),i}return new f({source:new E({resource:r,width:t.width,height:t.height,autoGarbageCollect:!1})})}placeRotated(e,t,n,r){switch(e.rotation=t*Math.PI/180,t){case 90:e.position.set(n,0);break;case 180:e.position.set(n,r);break;case 270:e.position.set(0,r);break;default:e.position.set(0,0)}}async buildTitleLayer(e,t,n,r){let i=e.title;if(!i)return null;let a=w(i,t),o=this.titles.get(e.id);if(!o||o.hash!==a){if(await re(i.fontFamily,i.fontWeight,i.italic),this.destroyed)return null;o=this.titles.get(e.id),o&&o.hash===a||(o&&o.view.destroy(),o={hash:a,view:Q(`text`,()=>T(i,t)),used:r},this.titles.set(e.id,o))}o.used=r;let s=o.view.view;return this.wrapLayer(e,s,this.width,this.height,t,n,r,()=>{s.parent?.removeChild(s)})}wrapLayer(e,t,n,r,i,a,o,s){let c=a-e.start,l=new C;l.addChild(t);let u=null,d=Ko(e,`crop`);if(d&&d.enabled){let e=Ro(O(d,c),n,r);u=new D().rect(e.x,e.y,e.width,e.height).fill({color:16777215}),l.addChild(u),l.mask=u}let f=Ko(e,`flip`),p=Po(O(Ko(e,`transform`)??Xo,c));if(f&&f.enabled){let e=O(f,c);(e.horizontal===!0||e.flipH===!0)&&(p.flipH=!p.flipH),(e.vertical===!0||e.flipV===!0)&&(p.flipV=!p.flipV)}let m=Fo(p,n,r,this.width,this.height),h=Math.abs(m.scaleX)*this.scaleX;Q(`effects`,()=>{let t=[];for(let a of e.effects){if(!a.enabled||a.fixed)continue;let e=this.effectRuntime(a,o);e&&(e.update(O(a,c),{width:n,height:r,time:c,fps:i.fps,scale:h>0?h:1}),t.push(e.filter))}t.length>0&&(l.filters=t)});let g=new C;g.addChild(l),g.pivot.set(m.pivot.x,m.pivot.y),g.position.set(m.x,m.y),g.scale.set(m.scaleX,m.scaleY),g.rotation=m.rotation;let _=Ko(e,`opacity`);if(_&&_.enabled){let e=O(_,c),t=typeof e.opacity==`number`?e.opacity:100;g.alpha=Math.min(1,Math.max(0,t/100));let n=typeof e.blendMode==`string`?Wo[e.blendMode]:void 0;g.blendMode=n??`normal`,n&&Go.has(n)&&(this.needsBackdrop=!0)}return{node:g,cleanup:()=>{l.filters=[],l.mask=null,l.removeChild(t),s(),g.destroy({children:!0})}}}effectRuntime(e,t){let n=this.effects.get(e.id);if(n&&n.type!==e.type&&(n.runtime.destroy(),this.effects.delete(e.id),n=void 0),!n){let r=null;try{r=ho(e.type)}catch(t){console.warn(`[braincut] effect ${e.type} failed to build:`,t)}if(!r)return null;n={type:e.type,runtime:r,used:t},this.effects.set(e.id,n)}return n.used=t,n.runtime}acquireTarget(){return this.rtPool.pop()||oe.create({width:this.canvas.width,height:this.canvas.height,antialias:!1,autoGarbageCollect:!1})}emptyTexture(){if(!this.empty){this.empty=this.acquireTarget();let e=new C;this.renderer?.render({container:e,target:this.empty,clear:!0,clearColor:[0,0,0,0]}),e.destroy()}return this.empty}safeMarginsOverlay(){if(!this.safeMargins){let e=new D,t=this.width,n=this.height;e.rect(t*.05,n*.05,t*.9,n*.9).stroke({color:16777215,alpha:.5,width:Math.max(1,t/960)}),e.rect(t*.1,n*.1,t*.8,n*.8).stroke({color:16777215,alpha:.35,width:Math.max(1,t/960)}),this.safeMargins=e}return this.safeMargins}sweep(e){for(let[t,n]of this.effects)e-n.used>Bo&&(n.runtime.destroy(),this.effects.delete(t));for(let[t,n]of this.titles)e-n.used>Bo&&(n.view.destroy(),this.titles.delete(t));for(let[t,n]of this.transitions)e-n.used>Bo&&(n.filter.destroy(),this.transitions.delete(t));for(let[t,n]of this.stills)e-n.used>Bo&&(n.texture.destroy(!0),this.stills.delete(t));for(let[t,n]of this.slates)e-n.used>Bo&&(n.view.destroy({children:!0,texture:!0,textureSource:!0}),this.slates.delete(t))}dropTargets(){for(let e of this.transitions.values())e.filter.clearInputs();for(let e of this.rtPool)e.destroy(!0);this.rtPool=[],this.empty?.destroy(!0),this.empty=null}dropGpuCaches(){this.dropTargets();for(let e of this.slates.values())e.view.destroy({children:!0,texture:!0,textureSource:!0});this.slates.clear();for(let e of this.toneMaps.values())e.destroy();this.toneMaps.clear();for(let e of this.stills.values())e.texture.destroy(!0);this.stills.clear();for(let e of this.titles.values())e.view.destroy();this.titles.clear();for(let e of this.effects.values())e.runtime.destroy();this.effects.clear();for(let e of this.transitions.values())e.filter.destroy();this.transitions.clear(),this.safeMargins?.destroy(),this.safeMargins=null}forget(e){let t=this.stills.get(e);t&&(t.texture.destroy(!0),this.stills.delete(e));for(let[e,t]of this.slates)t.view.destroy({children:!0,texture:!0,textureSource:!0}),this.slates.delete(e)}destroy(){this.destroyed||(this.destroyed=!0,this.canvas.removeEventListener(`webglcontextlost`,this.onLost),this.canvas.removeEventListener(`webglcontextrestored`,this.onRestored),this.tail.then(()=>{this.dropGpuCaches(),this.root.destroy({children:!0}),this.side.destroy(),this.renderer?.destroy(),this.renderer=null}))}};function Yo(e){return Math.max(2,Math.round(e/2)*2)}var Xo={id:``,type:`transform`,enabled:!0,fixed:!0,params:{},keyframes:{}},Zo=`no-preference`;function Qo(e){Zo=e}var $o=4,es=1,ts=3,ns=4,rs=1.5,is=600;function as(e,t){return e.timestamp+(e.duration>0?e.duration:1/t)}function $(e){if(e)try{e.close()}catch{}}function os(e,t){let n;try{n=e.toVideoFrame()}catch(e){throw Error(`the decoded picture cannot be used: ${e instanceof Error?e.message:String(e)}`)}let r=null;try{r=n.colorSpace?.transfer??null}catch{}return{image:n,width:e.squarePixelWidth||e.codedWidth,height:e.squarePixelHeight||e.codedHeight,timestamp:e.timestamp,rotation:t,transfer:r,release:()=>{try{n.close()}catch{}}}}var ss=class{tail=Promise.resolve();run(e){let t=this.tail.then(e,e);return this.tail=t.catch(()=>{}),t}},cs=class{sink;fps;duration;rotation;onClose;iter=null;current=null;queue=[];ended=!1;closed=!1;newest=-1/0;chain=new ss;filling=!1;failure=null;constructor(e,t,n,r,i){this.sink=e,this.fps=t,this.duration=n,this.rotation=r,this.onClose=i}frameAt(e){if(this.closed)return Promise.resolve(null);let t=Math.max(0,Math.min(e,this.duration));return this.chain.run(()=>this.advance(t))}async advance(e){let t=.5/this.fps,n=this.current!==null&&e<this.current.timestamp-t,r=this.newest!==-1/0&&e>this.newest+rs;(!this.iter||n||r)&&this.restart(e);for(let n=0;n<is;n++){if(this.closed)return null;for(;this.queue.length>0&&this.queue[0].timestamp<=e+t;)$(this.current),this.current=this.queue.shift();let n=this.current;if(n){let r=as(n,this.fps)>e+t,i=this.queue.length>0&&this.queue[0].timestamp>e+t;if(r||i||this.ended)break}else if(this.queue.length>0){this.current=this.queue.shift();break}else if(this.ended)return null;if(!await this.pull()&&this.ended)break}if(!this.current&&this.failure!==null)throw this.failure;return this.fill(),this.current?os(this.current,this.rotation):null}restart(e){let t=this.iter;t&&t.return().catch(()=>{});for(let e of this.queue)$(e);this.queue=[],$(this.current),this.current=null,this.ended=!1,this.newest=-1/0,this.failure=null,this.iter=this.sink.samples(e)}async pull(){let e=this.iter;if(!e||this.ended)return!1;let t;try{t=await e.next()}catch(t){return this.iter===e&&(this.ended=!0,this.failure=t),!1}return this.iter!==e||this.closed?(t.done||$(t.value),!1):t.done?(this.ended=!0,!1):(this.queue.push(t.value),this.newest=t.value.timestamp,!0)}fill(){this.filling||this.ended||this.closed||(this.filling=!0,this.chain.run(async()=>{try{for(;!this.closed&&!this.ended&&this.queue.length<ns&&await this.pull(););}finally{this.filling=!1}}))}close(){if(this.closed)return;this.closed=!0;let e=this.iter;this.iter=null,e&&e.return().catch(()=>{});for(let e of this.queue)$(e);this.queue=[],$(this.current),this.current=null,this.onClose(this)}},ls=class e{media;input;videoSink;audioSink;hasVideo;hasAudio;rotation;displayWidth;displayHeight;codedWidth;codedHeight;fps;duration;cache=[];tick=0;scrubs=new Map;chain=new ss;cursors=new Set;closed=!1;constructor(e,t,n,r,i){this.media=e,this.input=t,this.videoSink=n,this.audioSink=r,this.hasVideo=n!==null,this.hasAudio=r!==null,this.rotation=i.rotation,this.displayWidth=i.displayWidth,this.displayHeight=i.displayHeight,this.codedWidth=i.codedWidth,this.codedHeight=i.codedHeight,this.fps=i.fps,this.duration=i.duration}static async open(t,n){let r=new i({formats:o,source:new c(n)});try{let n=t.kind!==`audio`,[i,o]=await Promise.all([n?r.getPrimaryVideoTrack():Promise.resolve(null),r.getPrimaryAudioTrack()]),c=null,l={rotation:t.rotation,displayWidth:t.width,displayHeight:t.height,codedWidth:t.width,codedHeight:t.height,fps:t.fps&&t.fps>0?t.fps:30,duration:t.duration};if(i&&await i.canDecode()){c=new a(i,{hardwareAcceleration:Zo});let[e,t,n,r,o]=await Promise.all([i.getRotation(),i.getDisplayWidth(),i.getDisplayHeight(),i.getCodedWidth(),i.getCodedHeight()]);l.rotation=e,l.displayWidth=t,l.displayHeight=n,l.codedWidth=r,l.codedHeight=o,l.duration<=0&&(l.duration=await i.computeDuration())}let u=null;if(o&&await o.canDecode()&&(u=new s(o),l.duration<=0&&(l.duration=await o.computeDuration())),!c&&!u)throw Error(`Nothing in ${t.name} can be decoded by this browser`);return new e(t,r,c,u,l)}catch(e){throw r.dispose(),e}}frameAt(e,t=``){if(this.closed||!this.videoSink)return Promise.resolve(null);let n=Math.max(0,Math.min(e,this.duration));return this.chain.run(()=>this.randomAccess(n,t))}async randomAccess(e,t){let n=this.lookup(e);if(n)return os(n,this.rotation);let r=this.videoSink,i=this.scrubs.get(t);if(i&&!(e>=i.last&&e-i.last<es)&&(this.dropScrub(t),i=void 0),i&&i.ended){let e=this.exact(i.last);if(e)return os(e,this.rotation);this.dropScrub(t),i=void 0}i||(i={iter:r.samples(e),last:e,used:++this.tick,ended:!1},this.scrubs.set(t,i),this.evictScrubs(t)),i.used=++this.tick;let a=null,o=null;for(let n=0;n<is;n++){let n;try{n=await i.iter.next()}catch(e){o=e,this.scrubs.get(t)===i&&this.scrubs.delete(t);break}if(this.closed)return n.done||$(n.value),null;if(n.done){i.ended=!0;break}let r=n.value;if(i.last=r.timestamp,this.remember(r),r.timestamp>e+.5/this.fps||(a=r,as(r,this.fps)>e+.5/this.fps))break}let s=a??this.lookup(e)??this.newestBefore(e)??this.earliest();if(!s&&o!==null)throw o;return s?os(s,this.rotation):null}lookup(e){let t=.5/this.fps;for(let n of this.cache){let r=n.sample;if(r.timestamp<=e+t&&as(r,this.fps)>e+t)return n.used=++this.tick,r}return null}exact(e){for(let t of this.cache)if(t.sample.timestamp===e)return t.used=++this.tick,t.sample;return null}earliest(){let e=null;for(let t of this.cache)(!e||t.sample.timestamp<e.sample.timestamp)&&(e=t);return e&&(e.used=++this.tick),e?.sample??null}newestBefore(e){let t=null;for(let n of this.cache)n.sample.timestamp<=e&&(!t||n.sample.timestamp>t.sample.timestamp)&&(t=n);return t&&(t.used=++this.tick),t?.sample??null}remember(e){let t=this.cache.find(t=>t.sample.timestamp===e.timestamp);if(t)$(t.sample),t.sample=e,t.used=++this.tick;else for(this.cache.push({sample:e,used:++this.tick});this.cache.length>$o;){let e=0;for(let t=1;t<this.cache.length;t++)this.cache[t].used<this.cache[e].used&&(e=t);$(this.cache[e].sample),this.cache.splice(e,1)}}dropScrub(e){if(e===void 0){for(let e of Array.from(this.scrubs.keys()))this.dropScrub(e);return}let t=this.scrubs.get(e);t&&(this.scrubs.delete(e),t.iter.return().catch(()=>{}))}evictScrubs(e){for(;this.scrubs.size>ts;){let t=null,n=1/0;for(let[r,i]of this.scrubs)r!==e&&i.used<n&&(n=i.used,t=r);if(t===null)return;this.dropScrub(t)}}cursor(){if(this.closed||!this.videoSink)return{frameAt:()=>Promise.resolve(null),close:()=>{}};let e=new cs(this.videoSink,this.fps,this.duration,this.rotation,e=>this.cursors.delete(e));return this.cursors.add(e),e}async*audio(e,t){if(!this.closed&&this.audioSink&&!(t<=e))for await(let n of this.audioSink.buffers(Math.max(0,e),t)){if(this.closed)return;yield{buffer:n.buffer,timestamp:n.timestamp}}}stats(){return{frames:this.cache.length,cursors:this.cursors.size}}close(){if(!this.closed){this.closed=!0;for(let e of Array.from(this.cursors))e.close();this.dropScrub();for(let e of this.cache)$(e.sample);this.cache.length=0;try{this.input.dispose()}catch{}}}},us=3e3,ds=5e3,fs=536870912,ps=class{maxReaders;getBlob;readers=new Map;opening=new Map;failed=new Map;broken=new Map;onFailure;cursors=new Map;images=new Map;imageLoads=new Map;tick=0;disposed=!1;constructor(e){this.maxReaders=Math.max(1,e.maxReaders??8),this.getBlob=e.getBlob,this.onFailure=e.onFailure}failure(e){return this.broken.get(e)}clearFailure(e){e===void 0?this.broken.clear():this.broken.delete(e)}markBroken(e,t){this.reportUnusable(e.id,e.name,t instanceof Error?t.message:String(t))}reportUnusable(e,t,n){this.broken.has(e)||(this.broken.set(e,n),console.warn(`[braincut] ${t} cannot be shown here: ${n}`),this.onFailure?.(e,n))}async reader(e){if(this.disposed)return null;let t=this.readers.get(e.id);if(t)return t.used=++this.tick,t.reader;let n=this.opening.get(e.id);if(n)return n;let r=this.failed.get(e.id);if(r!==void 0&&performance.now()-r<ds)return null;let i=(async()=>{let t=!1;try{let n=await this.getBlob(e);if(!n)throw Error(`No file for ${e.name}`);t=!0;let r=await ls.open(e,n);return this.disposed?(r.close(),null):(this.readers.set(e.id,{reader:r,used:++this.tick,busy:0}),this.failed.delete(e.id),this.evictReaders(),r)}catch(n){return this.failed.set(e.id,performance.now()),t?this.markBroken(e,n):console.warn(`[braincut] could not open ${e.name}:`,n),null}finally{this.opening.delete(e.id)}})();return this.opening.set(e.id,i),i}evictReaders(){for(;this.readers.size>this.maxReaders;){let e=null,t=1/0;for(let[n,r]of this.readers)r.busy>0||r.used<t&&(t=r.used,e=n);if(e===null)return;this.closeReader(e)}}closeReader(e){let t=this.readers.get(e);if(t){this.readers.delete(e);for(let[t,n]of this.cursors)n.mediaId===e&&(n.cursor.close(),this.cursors.delete(t));t.reader.close()}}async image(e){if(this.disposed)return null;let t=this.images.get(e.id);if(t)return t.used=++this.tick,t.bitmap;let n=this.imageLoads.get(e.id);if(n)return n;let r=this.failed.get(e.id);if(r!==void 0&&performance.now()-r<ds)return null;let i=(async()=>{let t=!1;try{let n=await this.getBlob(e);if(!n)throw Error(`No file for ${e.name}`);t=!0;let r=await createImageBitmap(n);return this.disposed?(r.close(),null):(this.images.set(e.id,{bitmap:r,used:++this.tick}),this.failed.delete(e.id),this.evictImages(),r)}catch(n){return this.failed.set(e.id,performance.now()),t?this.markBroken(e,n):console.warn(`[braincut] could not decode ${e.name}:`,n),null}finally{this.imageLoads.delete(e.id)}})();return this.imageLoads.set(e.id,i),i}imageBytes(){let e=0;for(let t of this.images.values())e+=t.bitmap.width*t.bitmap.height*4;return e}evictImages(){for(;this.images.size>1&&this.imageBytes()>fs;){let e=null,t=1/0;for(let[n,r]of this.images)r.used<t&&(t=r.used,e=n);if(e===null)return;this.images.get(e).bitmap.close(),this.images.delete(e)}}async getFrame(e,t,n,r=``){if(this.disposed||this.broken.has(e.id))return null;try{return await this.decodeFrame(e,t,n,r)}catch(t){return this.markBroken(e,t),null}}async decodeFrame(e,t,n,r){if(e.kind===`image`){let t=await this.image(e);return t?{image:t,width:t.width,height:t.height,timestamp:0,release:()=>{}}:null}if(e.kind!==`video`)return null;let i=await this.reader(e);if(!i||!i.hasVideo)return null;let a=this.readers.get(e.id);a&&a.busy++;try{if(n===`play`){let n=`${e.id}:${r}`,a=this.cursors.get(n);return a||(a={cursor:i.cursor(),mediaId:e.id,used:0},this.cursors.set(n,a)),a.used=performance.now(),this.sweepCursors(),await a.cursor.frameAt(t)}return await i.frameAt(t,r)}finally{a&&a.busy--}}sweepCursors(){let e=performance.now();for(let[t,n]of this.cursors)e-n.used>us&&(n.cursor.close(),this.cursors.delete(t))}hold(e){let t=this.readers.get(e);if(!t)return()=>{};t.busy++;let n=!0;return()=>{n&&(n=!1,t.busy--)}}prefetch(e,t,n=``){this.disposed||this.getFrame(e,t,`play`,n).then(e=>e?.release()).catch(()=>{})}release(e){if(e===void 0){for(let e of Array.from(this.readers.keys()))this.closeReader(e);for(let e of this.cursors.values())e.cursor.close();this.cursors.clear();for(let e of this.images.values())e.bitmap.close();this.images.clear(),this.failed.clear(),this.broken.clear();return}this.closeReader(e);let t=this.images.get(e);t&&(t.bitmap.close(),this.images.delete(e)),this.failed.delete(e),this.broken.delete(e)}stats(){let e=0;for(let t of this.readers.values())e+=t.reader.stats().frames;return{readers:this.readers.size,cursors:this.cursors.size,images:this.images.size,imageBytes:this.imageBytes(),frames:e}}dispose(){this.disposed||=(this.release(),!0)}};export{Oe as C,ke as E,je as S,ue as T,Ze as _,Lo as a,Je as b,at as c,nt as d,Ye as f,Qe as g,O as h,Fo as i,rt as l,et as m,Qo as n,Io as o,Xe as p,Jo as r,Po as s,ps as t,it as u,tt as v,Ee as w,Ae as x,$e as y};