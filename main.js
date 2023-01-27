const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");


var width = window.innerWidth;
var height = window.innerHeight;

canvas.width = width;
canvas.height = height;


const W = 16;
const H = 16;




let pg = load();
let cam = [-0.5, -0.5];
let mouse = [0, 0];
let pressed = false;
let dragging = false;
let d = [0, 0];
let zoom = 1000;
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('mousemove', (p) => {
  mouse[0] = (p.pageX);
  mouse[1] = (p.pageY);
}, false);

document.onmousedown = function (e) {
  if (e.button == 0) {
    pressed = true;
    d = [mouse[0], mouse[1]];
  }
  if (e.button == 2) {
    d = [mouse[0], mouse[1]];
    dragging = true;
  }
};

document.onmouseup = function (e) {
  if (e.button == 0) {
    pressed = false;
  }
  if (e.button == 2) {
    dragging = false;
  }
};


document.addEventListener("wheel", (e) => {
  if (e.deltaY < 0) {
    zoom *= 1.1;
  }else {
    zoom /= 1.1;
  }
});


function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createTexture(gl, data, w, h){


  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const level = 0;
  const texwidth = w;//blocks.length;
  const texheight = h;
  const border = 0;
  const internalFormat = gl.R16UI;
  const format = gl.RED_INTEGER;
  const type = gl.UNSIGNED_SHORT;
  gl.texImage2D(
    gl.TEXTURE_2D, level, internalFormat,
    texwidth, texheight, border, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  return tex;
}



function createRGBATexture(gl, data, w, h){


  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  const level = 0;
  const texwidth = w;//blocks.length;
  const texheight = h;
  const border = 0;
  const internalFormat = gl.RGBA;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  gl.texImage2D(
    gl.TEXTURE_2D, level, internalFormat,
    texwidth, texheight, border, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  return tex;
}

function initBuffers(gl, prog) {
  const positions = [
    -1, -1,
    1, -1,
    -1,  1,
    -1,  1,
    1, -1,
    1,  1,
  ];
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


  const numComponents = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.vertexAttribPointer(
    prog.attribLocations.position,
    numComponents,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(prog.attribLocations.position);

  const texture = [
    0, 1,
    1, 1,
    0,  0,
    0,  0,
    1, 1,
    1,  0,
  ];
  const textureBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texture), gl.STATIC_DRAW);

  const numComponents2 = 2;
  gl.vertexAttribPointer(
    prog.attribLocations.texture,
    numComponents2,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(prog.attribLocations.texture);

  /*return {
    position: positionBuffer,
  };*/
}

function load(){

  const vs = `#version 300 es
in vec4 aPosition;
in vec2 aTex;

out vec2 v_texcoord;

void main() {
  gl_Position = aPosition;
  v_texcoord = aTex;
}
`;

  const fs = `#version 300 es
precision highp float;
uniform highp usampler2D u_tex;
uniform highp sampler2D u_avTex;

uniform vec2 u_resolution;
uniform float u_zoom;
uniform vec2 u_camera;

in vec2 v_texcoord;
out vec4 fooColor;

void main() {

  vec2 coord = ((v_texcoord.xy-vec2(0.5, 0.5))*u_resolution.xy)/u_zoom - u_camera;

  vec2 subP = coord;

  uvec4 p = texture(u_tex, vec2(0., 0.));
  float v = 60.;

  for(int i = 0; i < int(log(u_zoom)/log(16.))+1; i ++){
    subP = vec2(mod(subP.x*16., 16.), mod(subP.y*16., 16.));

    p = texture(u_tex, vec2((floor(subP.x)*16. + floor(subP.y))/256., v/486.0));
    v = float(p.x);
  }

  vec4 c = texture(u_avTex, vec2(0.5, (v+1./2.)/487.));

  fooColor = vec4(c.xyz, 1);
}
`;

  const shaderProgram = initShaderProgram(gl, vs, fs);
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      position: gl.getAttribLocation(shaderProgram, 'aPosition'),
      texture: gl.getAttribLocation(shaderProgram, 'aTex'),
    },
    uniformLocations: {
      tex: gl.getUniformLocation(shaderProgram, 'u_tex'),
      avTex: gl.getUniformLocation(shaderProgram, 'u_avTex'),
      resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
      camera: gl.getUniformLocation(shaderProgram, 'u_camera'),
      zoom: gl.getUniformLocation(shaderProgram, 'u_zoom'),
	    time: gl.getUniformLocation(shaderProgram, 'uTime'),
    },
  };

  initBuffers(gl, programInfo);

  //TEXTUREEEE


  let colors = new Uint16Array(blockAverages.flat());

  let avColors = new Uint8Array(blockColors.flat());

  const tex = createTexture(gl, colors, blockAverages[0].length, blockAverages.length);
  const avtex = createRGBATexture(gl, avColors, 1, blockColors.length);

  gl.useProgram(programInfo.program);

  gl.uniform1i(programInfo.uniformLocations.tex, 0);
  gl.uniform1i(programInfo.uniformLocations.avTex, 1);



  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, avtex);

  return programInfo;

  /*let avcolors = new Uint8Array(avBlock.flat());

  const avtex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, avtex);
  const avlevel = 0;
  const avtexwidth = avBlock.length;
  const avtexheight = avBlock.length;
  const avborder = 0;
  const avinternalFormat = gl.RGBA;
  const avformat = gl.RGBA;
  const avtype = gl.UNSIGNED_BYTE;
  gl.texImage2D(
    gl.TEXTURE_2D, avlevel, avinternalFormat,
    avtexwidth, avtexheight, avborder, avformat, avtype, avcolors);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  */
}

function render(){

  if (dragging || pressed) {
    cam = [cam[0]-(d[0]-mouse[0])/zoom, cam[1]-(d[1]-mouse[1])/zoom]
    d = [mouse[0], mouse[1]];
  }



  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform2fv(
      pg.uniformLocations.resolution,
      new Float32Array([width, height]));
  gl.uniform2fv(
      pg.uniformLocations.camera,
      new Float32Array(cam));
  gl.uniform1f(
      pg.uniformLocations.time,
      (Date.now()/10)%360);
  gl.uniform1f(
      pg.uniformLocations.zoom,
      zoom);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  /*context.clearRect(0, 0, width, height);
  context.beginPath();
  context.fillStyle = "black";
  context.rect(0, 0, width, height);
  context.fill();

  renderT(context, 0, 0, 4096, 4096, 3, 60);*/
  window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);



