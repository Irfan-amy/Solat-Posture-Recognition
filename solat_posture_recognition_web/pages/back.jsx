import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { useRef, useEffect, useState } from "react";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import {
  Results,
  Pose,
  POSE_CONNECTIONS,
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

const Home = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [flip, setFlip] = useState(true);
  const { height, width } = useWindowDimensions();
  const inputVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  var videoHeight = height;
  var videoWidth = width;


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
        constraints.facingMode = flip ? 'environment' : 'user';
      }
      // const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (inputVideoRef.current) {
            inputVideoRef.current.srcObject = stream;
          }
          if (callback)
            callback();
        });
    } catch (error) {
      console.error(error);
    }
  }

  
  useEffect(() => {
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
      canvasRef.current.width = width;
      canvasRef.current.height = height;
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
          { visibilityMin: 0.65, color: "white" }
        );
        drawLandmarks(
          contextRef.current,
          Object.values(POSE_LANDMARKS_LEFT).map(
            (index) => results.poseLandmarks[index]
          ),
          { visibilityMin: 0.65, color: "white", fillColor: "rgb(255,138,0)" }
        );
        drawLandmarks(
          contextRef.current,
          Object.values(POSE_LANDMARKS_RIGHT).map(
            (index) => results.poseLandmarks[index]
          ),
          { visibilityMin: 0.65, color: "white", fillColor: "rgb(0,217,231)" }
        );
        drawLandmarks(
          contextRef.current,
          Object.values(POSE_LANDMARKS_NEUTRAL).map(
            (index) => results.poseLandmarks[index]
          ),
          { visibilityMin: 0.65, color: "white", fillColor: "white" }
        );
      }
      contextRef.current.restore();
    }
  };

  return (
    <div className="pose-container">
      <video
        autoPlay
        ref={(el) => {
          inputVideoRef.current = el;
          setInputVideoReady(!!el);
        }}
        hidden={true}
      />
      <canvas ref={canvasRef} width={1280} height={720} />
      <div className="absolute bottom-16 flex flex-col-reverse self-end w-full">
        <div className="flex flex-row justify-center w-full py-8  gap-2">
          <div className="flex-none">
            <button
              onClick={(e) => {
                e.preventDefault();
                setFlip(!flip);
                getMedia(flip,null);
              }}
              className="self-center bg-slate-500 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>
          </div>
          <div className="flex-none">
            <div className="self-center bg-blue-500 text-white font-bold py-4 px-4 rounded-full">
              Status
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
