import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import React, { useRef, useEffect, useState } from "react";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import useWindowDimensions from "../hooks/useWindowsDimensions";
import {
  Results,
  Pose,
  POSE_CONNECTIONS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  POSE_LANDMARKS_NEUTRAL,
  VERSION,
} from "@mediapipe/pose";
import {
  drawConnectors,
  drawLandmarks,
  Data,
  lerp,
} from "@mediapipe/drawing_utils";

const Home = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(true);

  const inputVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const { height, width } = useWindowDimensions();

  var videoHeight = height;
  var videoWidth = width;

  useEffect(() => {
    if (inputVideoRef.current && canvasRef.current) {
      async function getMedia() {
        try {
          const supportedConstraints = await navigator.mediaDevices.getSupportedConstraints();
          let constraints = {};
          if (supportedConstraints.width && supportedConstraints.height) {
              constraints.width = { min: supportedConstraints.width, ideal: 1920 };
              constraints.height = { min: supportedConstraints.height, ideal: 1080 };
          }
          // const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
          navigator.mediaDevices.getUserMedia({video:constraints}).then((stream) => {
            if (inputVideoRef.current) {
              inputVideoRef.current.srcObject = stream;
            }
            
            // sendToMediaPipe();
          });
        } catch (error) {
          console.error(error);
        }
      }
  
      if (navigator.mediaDevices) {
        getMedia();
      }
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
      pose.initialize();
      const sendToMediaPipe = async () => {
        if (inputVideoRef.current) {
          if (inputVideoRef.current.readyState != 4) {
            console.log(inputVideoRef.current.readyState);
            requestAnimationFrame(sendToMediaPipe);
          } else {
            pose.initialize();
            await pose.send({ image: inputVideoRef.current });
            requestAnimationFrame(sendToMediaPipe);
          }
        }
      };
    }
  }, [inputVideoReady]);

  const onResults = (results) => {
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);
      console.log("Tes",inputVideoRef.current.readyState);
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
    //   <div className="pose-container">
    //     <video
    //       autoPlay
    //       ref={(el) => {
    //         inputVideoRef.current = el;
    //         setInputVideoReady(!!el);
    //       }}
    //       hidden={true}
    //     />
    //     <canvas ref={canvasRef} width={1280} height={720} />
    //     {!loaded && (
    //       <div className="loading">
    //         <div className="spinner"></div>
    //         <div className="message">Loading</div>
    //       </div>
    //     )}
    //   </div>
    // );
    <div>
        {loaded ?<div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100vw",
            height: "100vh",
          }}
        >
          <video
            ref={inputVideoRef}
            autoPlay
            style={{
              position: "absolute",
              objectFit: "cover",
              width: "100vw",
              height: "100vh",
              zIndex: -2,
            }}
            // hidden={true}
          ></video>
          <canvas
            ref={canvasRef} height={videoHeight}
            width={videoWidth}
            style={{ position: "absolute", zIndex: -1 ,width: "100vw",
            height: "100vh",}}
          />
          {loaded ? <></> : <div>loading...</div>}
          <div className="flex flex-col-reverse self-end w-full mx-8 ">
            <div className="flex flex-row justify-center w-full py-8  gap-2">
              <div className="flex-none">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    goStaffList();
                  }}
                  className="self-center bg-slate-500 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="#ffffff"
                    className="w-6 h-6"
                  >
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                </button>
              </div>
              <div className="flex-none">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    goAttendances();
                  }}
                  className="self-center bg-slate-500 hover:bg-slate-700 text-white font-bold py-4 px-4 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M12.75 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM7.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM8.25 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.75 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM10.5 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM12.75 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM14.25 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 17.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 15.75a.75.75 0 100-1.5.75.75 0 000 1.5zM15 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM16.5 13.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                    <path
                      fillRule="evenodd"
                      d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-none">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    checkButton();
                  }}
                  className="h-full self-center bg-blue-500 hover:bg-blue-700 text-white font-[Montserrat] font-bold py-4 px-4 rounded-full inline-flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                    />
                  </svg>

                  <span className=" text-[14px] font-semibold">Check In</span>
                </button>
              </div>
            </div>
            <div className="flex flex-row justify-center py-2  gap-8">
              <div className="justify-center gap-2 flex flex-row bg-white rounded-lg">
                <div className=" px-8 py-4  font-[Montserrat] text-[14px] md:text-[16px] lg:text-[18px] font-semibold">
                  Nmae
                </div>
                <div className="s px-8 py-4  font-[Montserrat] text-[14px] md:text-[16px] lg:text-[18px] font-regular">
                  Test
                </div>
              </div>
            </div>
          </div>
        </div>:(<></>)}
      </div>
      
  );
};

export default Home;
