import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { useRef, useEffect, useState } from "react";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import {
  Results,
  Pose,
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  POSE_LANDMARKS_NEUTRAL,
  VERSION,
} from "@mediapipe/pose";
import useWindowDimensions from "../hooks/useWindowsDimensions";
import {
  drawConnectors,
  drawLandmarks,
  Data,
  lerp,
} from "@mediapipe/drawing_utils";
let model = null;
const Home = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // const [model, setModel] = useState(null);
  
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [text, setText] = useState("0");
  const updateDimensions = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  };

  useEffect(() => {
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const inputVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const divRef = useRef(null);
  const contextRef = useRef(null);
  var videoHeight = height;
  var videoWidth = width;

  function calculate_angle(a, b, c) {
    var ba = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    var bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];

    var cosineAngle =
      (ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2]) /
      (Math.sqrt(ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]) *
        Math.sqrt(bc[0] * bc[0] + bc[1] * bc[1] + bc[2] * bc[2]));
    var angle = Math.acos(cosineAngle);

    return (angle * 180) / Math.PI;
  }

  async function getMedia(flip, callback) {
    try {
      console.log(flip);
      const supportedConstraints =
        await navigator.mediaDevices.getSupportedConstraints();
      let constraints = {
        video: { width: { min: 1280 }, height: { min: 720 } },
      };
      if (supportedConstraints.width && supportedConstraints.height) {
        constraints.video.width = {
          min: supportedConstraints.width,
          ideal: 1920,
        };
        constraints.video.height = {
          min: supportedConstraints.height,
          ideal: 1080,
        };
        constraints.video.facingMode = "environment";
        console.log(supportedConstraints.width, supportedConstraints.height);
      }
      // const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
      console.log("test", constraints);
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (inputVideoRef.current) {
          inputVideoRef.current.srcObject = stream;
        }
        if (callback) callback();
      });
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
      divRef.current.width = width;
      divRef.current.height = height;
      canvasRef.current.width = divRef.current.width;
      canvasRef.current.height = divRef.current.height;
    }
  });

  useEffect(() => {
    tf.loadLayersModel("/model.json")
      .then((loadedModel) => {
        // setModel(loadedModel);
        model = loadedModel;
        let _ = loadedModel;
        console.log("Model loaded", model);
      })
      .catch((err) => {
        console.error("Error loading model", err);
      });
  }, []);

  useEffect(() => {
    // let testCases = [
    //   {
    //     points: [
    //       [1, 0, 0],
    //       [0, 1, 0],
    //       [0, 0, 1],
    //     ],
    //     expected: 120,
    //   },
    //   {
    //     points: [
    //       [2, 3, 4],
    //       [5, 6, 7],
    //       [8, 9, 10],
    //     ],
    //     expected: 33.69006752597978,
    //   },
    //   {
    //     points: [
    //       [-1, 0, 0],
    //       [0, -1, 0],
    //       [0, 0, -1],
    //     ],
    //     expected: 120,
    //   },
    //   {
    //     points: [
    //       [-2, -3, -4],
    //       [-5, -6, -7],
    //       [-8, -9, -10],
    //     ],
    //     expected: 33.69006752597978,
    //   },
    // ];

    // testCases.forEach(({ points, expected }) => {
    //   let angle = calculateAngle(points[0], points[1], points[2]);
    //   console.log(`Expected: ${expected} , Test Result : ${angle}`);
    // });

    if (!inputVideoReady) {
      return;
    }
    if (inputVideoRef.current && canvasRef.current) {
      console.log("rendering");
      contextRef.current = canvasRef.current.getContext("2d");

      const pose = new Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${VERSION}/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);
      const sendToMediaPipe = async () => {
        if (inputVideoRef.current) {
          if (!inputVideoRef.current.videoWidth) {
            console.log(inputVideoRef.current.readyState);
            requestAnimationFrame(sendToMediaPipe);
          } else {
            await pose.send({ image: inputVideoRef.current });
            requestAnimationFrame(sendToMediaPipe);
          }
        }
      };

      if (navigator.mediaDevices) {
        getMedia(false, sendToMediaPipe);
      }
    }
  }, [inputVideoReady]);

  const onResults = (results) => {
    
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);

      if (results) predict(results.poseLandmarks);
      contextRef.current.save();
      contextRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      contextRef.current.drawImage(
        results.image,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      if (results.poseLandmarks) {
        drawConnectors(
          contextRef.current,
          results.poseLandmarks,
          POSE_CONNECTIONS,
          { visibilityMin: 0.75, color: "white" }
        );
        drawLandmarks(
          contextRef.current,
          Object.values(POSE_LANDMARKS_LEFT).map(
            (index) => results.poseLandmarks[index]
          ),
          { visibilityMin: 0.75, color: "white", fillColor: "rgb(255,138,0)" }
        );
        drawLandmarks(
          contextRef.current,
          Object.values(POSE_LANDMARKS_RIGHT).map(
            (index) => results.poseLandmarks[index]
          ),
          { visibilityMin: 0.75, color: "white", fillColor: "rgb(0,217,231)" }
        );
        drawLandmarks(
          contextRef.current,
          Object.values(POSE_LANDMARKS_NEUTRAL).map(
            (index) => results.poseLandmarks[index]
          ),
          { visibilityMin: 0.75, color: "white", fillColor: "white" }
        );
      }
      contextRef.current.restore();
    }
  };

  function predict(landmarks) {
    if (!landmarks) return;
    if (landmarks.length < 33) return;
    try {
      if (
        ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_ELBOW].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_WRIST].visibility > 0.75) ||
          (landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility > 0.75 &&
            landmarks[POSE_LANDMARKS.RIGHT_ELBOW].visibility > 0.75 &&
            landmarks[POSE_LANDMARKS.RIGHT_WRIST].visibility > 0.75)) &&
        ((landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility > 0.75) ||
          (landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility > 0.75 &&
            landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility > 0.75 &&
            landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility > 0.75)) &&
        ((landmarks[POSE_LANDMARKS.LEFT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility > 0.75) ||
          (landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility > 0.75 &&
            landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility > 0.75 &&
            landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility > 0.75))
      ) {
        let inputData = [];
        let image_height = inputVideoRef.current.videoHeight;
        let image_width = inputVideoRef.current.videoWidth;
        if (
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_ELBOW].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_WRIST].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_ELBOW].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_WRIST].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x +
                landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y +
                landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].z +
                landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].z) *
                0.5,
            ],
            [
              (landmarks[POSE_LANDMARKS.LEFT_ELBOW].x +
                landmarks[POSE_LANDMARKS.RIGHT_ELBOW].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_ELBOW].y +
                landmarks[POSE_LANDMARKS.RIGHT_ELBOW].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_ELBOW].z +
                landmarks[POSE_LANDMARKS.RIGHT_ELBOW].z) *
                0.5,
            ],
            [
              (landmarks[POSE_LANDMARKS.LEFT_WRIST].x +
                landmarks[POSE_LANDMARKS.RIGHT_WRIST].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_WRIST].y +
                landmarks[POSE_LANDMARKS.RIGHT_WRIST].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_WRIST].z +
                landmarks[POSE_LANDMARKS.RIGHT_WRIST].z) *
                0.5,
            ]
          );

          inputData.push(angle);
        } else if (
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_ELBOW].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_WRIST].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_ELBOW].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_ELBOW].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_ELBOW].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_WRIST].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_WRIST].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_WRIST].z,
            ]
          );

          inputData.push(angle);
        } else if (
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_ELBOW].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_WRIST].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_ELBOW].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_ELBOW].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_ELBOW].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_WRIST].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_WRIST].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_WRIST].z,
            ]
          );
          inputData.push(angle);
        } else console.log("Error");

        if (
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x +
                landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y +
                landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].z +
                landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].z) *
                0.5,
            ],
            [
              (landmarks[POSE_LANDMARKS.LEFT_HIP].x +
                landmarks[POSE_LANDMARKS.RIGHT_HIP].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_HIP].y +
                landmarks[POSE_LANDMARKS.RIGHT_HIP].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_HIP].z +
                landmarks[POSE_LANDMARKS.RIGHT_HIP].z) *
                0.5,
            ],
            [
              (landmarks[POSE_LANDMARKS.LEFT_KNEE].x +
                landmarks[POSE_LANDMARKS.RIGHT_KNEE].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_KNEE].y +
                landmarks[POSE_LANDMARKS.RIGHT_KNEE].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_KNEE].z +
                landmarks[POSE_LANDMARKS.RIGHT_KNEE].z) *
                0.5,
            ]
          );

          inputData.push(angle);
        } else if (
          landmarks[POSE_LANDMARKS.LEFT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_HIP].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_HIP].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_HIP].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_KNEE].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].z,
            ]
          );
          inputData.push(angle);
        } else if (
          landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_SHOULDER].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_HIP].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_HIP].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_HIP].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_KNEE].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].z,
            ]
          );
          inputData.push(angle);
        } else console.log("Error");

        if (
          landmarks[POSE_LANDMARKS.LEFT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              (landmarks[POSE_LANDMARKS.LEFT_HIP].x +
                landmarks[POSE_LANDMARKS.RIGHT_HIP].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_HIP].y +
                landmarks[POSE_LANDMARKS.RIGHT_HIP].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_HIP].z +
                landmarks[POSE_LANDMARKS.RIGHT_HIP].z) *
                0.5,
            ],
            [
              (landmarks[POSE_LANDMARKS.LEFT_KNEE].x +
                landmarks[POSE_LANDMARKS.RIGHT_KNEE].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_KNEE].y +
                landmarks[POSE_LANDMARKS.RIGHT_KNEE].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_KNEE].z +
                landmarks[POSE_LANDMARKS.RIGHT_KNEE].z) *
                0.5,
            ],
            [
              (landmarks[POSE_LANDMARKS.LEFT_ANKLE].x +
                landmarks[POSE_LANDMARKS.RIGHT_ANKLE].x) *
                0.5 *
                image_width,
              (landmarks[POSE_LANDMARKS.LEFT_ANKLE].y +
                landmarks[POSE_LANDMARKS.RIGHT_ANKLE].y) *
                0.5 *
                image_height,
              (landmarks[POSE_LANDMARKS.LEFT_ANKLE].z +
                landmarks[POSE_LANDMARKS.RIGHT_ANKLE].z) *
                0.5,
            ]
          );

          inputData.push(angle);
        } else if (
          landmarks[POSE_LANDMARKS.LEFT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_KNEE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.LEFT_ANKLE].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              landmarks[POSE_LANDMARKS.LEFT_HIP].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_HIP].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_HIP].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_KNEE].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_ANKLE].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_ANKLE].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_ANKLE].z,
            ]
          );
          inputData.push(angle);
        } else if (
          landmarks[POSE_LANDMARKS.RIGHT_HIP].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_KNEE].visibility > 0.75 &&
          landmarks[POSE_LANDMARKS.RIGHT_ANKLE].visibility > 0.75
        ) {
          var angle = calculate_angle(
            [
              landmarks[POSE_LANDMARKS.LEFT_HIP].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_HIP].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_HIP].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_KNEE].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_KNEE].z,
            ],
            [
              landmarks[POSE_LANDMARKS.LEFT_ANKLE].x * image_width,
              landmarks[POSE_LANDMARKS.LEFT_ANKLE].y * image_height,
              landmarks[POSE_LANDMARKS.LEFT_ANKLE].z,
            ]
          );
          inputData.push(angle);
        } else console.log("Error");
        console.log([inputData]);
        const input = tf.tensor2d([inputData]);
        
        // Make predictions
        if (model) {
          const labels = ["Sujud","Jalsa","Ruku"]
          const predictions = model.predict(input).dataSync();
          const predictionLabel = labels[predictions.indexOf(Math.max(...predictions))];
          setText(predictionLabel);
          console.log(predictionLabel);
        }
      }
    } catch (e) {
      console.log(e);
      console.log(landmarks);
    }
  }

  return (
    <div ref={divRef} className="pose-container w-screen h-screen">
      <video
        autoPlay
        ref={(el) => {
          inputVideoRef.current = el;
          setInputVideoReady(!!el);
        }}
        hidden={true}
      />
      <canvas ref={canvasRef} width={1280} height={720} />
      <div className="absolute bottom-2 flex flex-col-reverse self-end w-screen ">
        <div className="flex flex-row justify-center w-full py-8  gap-2">
          <div className="flex-none">
            <div className="self-center bg-blue-500 text-white text-[2.5vh] font-bold py-[2vh] px-[4vh] rounded-full">
              {text}
            </div>
          </div>
        </div>
      </div>
      {!loaded && (
        <div className="loading">
          <div className="spinner"></div>
          <div className="message">Loading</div>
        </div>
      )}
    </div>
  );
};

export default Home;
