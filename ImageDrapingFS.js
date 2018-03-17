//This file is automatically rebuilt by the Cesium build process.
/*global define*/
define(function() {
    'use strict';
    return "varying vec3 v_positionEC;\n\
varying vec3 v_normalEC;\n\
varying vec2 v_st;\n\
\n\
\n\
vec4 windowToEye(vec4 fragCoord)\n\
{\n\
  vec2 uv = fragCoord.xy / czm_viewport.zw;\n\
  float z_window = czm_unpackDepth(texture2D(czm_globeDepthTexture, uv));\n\
  if (z_window == 1.0)\n\
    discard;\n\
  \n\
  float near = czm_depthRange.near;\n\
  float far = czm_depthRange.far;\n\
  \n\
  vec3 ndcPos;\n\
  ndcPos.x = 2.0 * (fragCoord.x - czm_viewport.x) / czm_viewport.z - 1.0;\n\
  ndcPos.y = 2.0 * (fragCoord.y - czm_viewport.y) / czm_viewport.w - 1.0;\n\
  ndcPos.z = (2.0 * z_window - near - far) / (far - near);\n\
    \n\
  vec4 clipPos;\n\
  clipPos.w = czm_projection[3][2] / (ndcPos.z - (czm_projection[2][2] / czm_projection[2][3]));\n\
  clipPos.xyz = ndcPos * clipPos.w;\n\
  \n\
  return czm_inverseProjection * clipPos;\n\
  //return vec4(ndcPos, 1.0);\n\
}\n\
\n\
\n\
// Camera model and frames are based on OpenCV conventions:\n\
// http://docs.opencv.org/2.4/modules/calib3d/doc/camera_calibration_and_3d_reconstruction.html\n\
// we pass in a normalized intrinsic matrix as uniform so we can compute the normalized texture coordinates directly\n\
void main()\n\
{\n\
    vec3 positionToEyeEC = -v_positionEC; \n\
        \n\
    // get fragment 3D pos in eye coordinates using depth buffer value at fragment location\n\
    vec4 v_posEC = windowToEye(gl_FragCoord);\n\
    \n\
    // translate to video cam frame\n\
    vec4 camPosEC = czm_modelViewRelativeToEye * czm_translateRelativeToEye(camPosHigh_1, camPosLow_2);    \n\
    vec4 v_posCam = v_posEC - camPosEC;\n\
    \n\
    // rotate to video cam frame\n\
    vec3 lookRay = camAtt_3*czm_inverseViewRotation3D*v_posCam.xyz;\n\
    \n\
    // discard if behind camera\n\
    if (lookRay.z < 0.1)\n\
        discard;\n\
    \n\
    // undistort\n\
    float xn = lookRay.x / lookRay.z;\n\
    float yn = lookRay.y / lookRay.z;\n\
    float k1 = camDistR_5[0];\n\
    float k2 = camDistR_5[1];\n\
    float k3 = camDistR_5[2];\n\
    float p1 = camDistT_6[0];\n\
    float p2 = camDistT_6[1];\n\
    float r2 = xn*xn+yn*yn;\n\
    float r4 = r2*r2;\n\
    float r6 = r4*r2;\n\
    float xd = xn*(1. + k1*r2 + k2*r4 + k3*r6) + 2.*p1*xn*yn + p2*(r2 + 2.*xn*xn);\n\
    float yd = yn*(1. + k1*r2 + k2*r4 + k3*r6) + 2.*p2*xn*yn + p1*(r2 + 2.*yn*yn);\n\
    \n\
    // project with pinhole model\n\
    vec3 st = camProj_4 * vec3(xd, yd, 1.);\n\
    st.y = 1.0 - st.y;    \n\
    if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0)\n\
        discard;\n\
\n\
    // get color from material \n\
    czm_materialInput materialInput;\n\
    materialInput.positionToEyeEC = positionToEyeEC;\n\
    materialInput.st = vec2(st.x, st.y);\n\
    czm_material material = czm_getMaterial(materialInput);    \n\
    gl_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
\n\
    //float depth = pow(v_posEC.z * 0.5 + 0.5, 8.0);\n\
    //gl_FragColor = vec4(depth, depth, depth, 1.0);\n\
}\n\
";
});