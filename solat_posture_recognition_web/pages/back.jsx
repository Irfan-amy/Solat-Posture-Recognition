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
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
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
