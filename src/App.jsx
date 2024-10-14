import React, { useEffect, useRef } from "react";
import * as BABYLON from "babylonjs";
import * as CANNON from "cannon";
import "babylonjs-loaders";
import "./App.css"; // Import your styles here

const App = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = new BABYLON.Engine(canvas, true);

    // Attach CANNON to the global window object so Babylon.js can use it
    window.CANNON = CANNON;

    const MAX_FORCE = 10;
    let powerMeter = 0;

    // Power bar update function
    const updatePowerBar = (power) => {
      const powerBar = document.getElementById("power-bar");
      const maxPowerBarWidth = 150;
      powerBar.style.width = `${Math.min(
        (power / MAX_FORCE) * maxPowerBarWidth,
        maxPowerBarWidth
      )}px`;
    };

    // Reset power bar
    const resetPowerBar = () => {
      document.getElementById("power-bar").style.width = "0px";
    };

    const createScene = () => {
      const scene = new BABYLON.Scene(engine);

      // Enable physics with Cannon.js
      scene.enablePhysics(
        new BABYLON.Vector3(0, -9.81, 0),
        new BABYLON.CannonJSPlugin()
      );

      // Camera
      const camera = new BABYLON.ArcRotateCamera(
        "ArcRotateCamera",
        Math.PI / 2,
        Math.PI / 3,
        20,
        new BABYLON.Vector3(0, 50, -50),
        scene
      );
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 5;
      camera.upperRadiusLimit = 30;
      camera.panningSensibility = 0;

      // Light
      const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(0, 1, 0),
        scene
      );

      // Walls
      const wallMaterial = new BABYLON.StandardMaterial("wallMaterial", scene);
      wallMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);

      const createWall = (name, width, height, depth, position) => {
        const wall = BABYLON.MeshBuilder.CreateBox(
          name,
          { width, height, depth },
          scene
        );
        wall.position = position;
        wall.material = wallMaterial;
        wall.physicsImpostor = new BABYLON.PhysicsImpostor(
          wall,
          BABYLON.PhysicsImpostor.BoxImpostor,
          { mass: 0, restitution: 1 },
          scene
        );
        return wall;
      };

      createWall("leftWall", 1, 2, 40, new BABYLON.Vector3(-5.5, 1, 15));
      createWall("rightWall", 1, 2, 40, new BABYLON.Vector3(5.5, 1, 15));
      createWall("backWall", 10, 2, 1, new BABYLON.Vector3(0, 1, 30));
      createWall("frontWall", 10, 2, 1, new BABYLON.Vector3(0, 1, 0));

      // Golf course ground
      const box = BABYLON.MeshBuilder.CreateBox(
        "box",
        { height: 1, width: 10, depth: 40 },
        scene
      );
      box.position.y = -0.5;
      box.position.z = 15;
      box.material = new BABYLON.StandardMaterial("boxMat", scene);
      box.material.diffuseColor = new BABYLON.Color3(0.13, 0.55, 0.13);

      // Hole
      const holeDiameter = 2.5;
      const hole = BABYLON.MeshBuilder.CreateCylinder(
        "hole",
        { diameter: holeDiameter, height: 4 },
        scene
      );
      hole.position.y = 1;
      hole.position.z = 20;

      const boxCSG = BABYLON.CSG.FromMesh(box);
      const holeCSG = BABYLON.CSG.FromMesh(hole);
      const boxWithHole = boxCSG
        .subtract(holeCSG)
        .toMesh("boxWithHole", box.material, scene);
      box.dispose();
      hole.dispose();

      boxWithHole.physicsImpostor = new BABYLON.PhysicsImpostor(
        boxWithHole,
        BABYLON.PhysicsImpostor.MeshImpostor,
        { mass: 0, friction: 0.5, restitution: 0.1 },
        scene
      );

      // Goal
      const goal = BABYLON.MeshBuilder.CreateCylinder(
        "goal",
        { diameter: holeDiameter, height: 0.2 },
        scene
      );
      goal.position.y = -2;
      goal.position.z = 20;
      goal.material = new BABYLON.StandardMaterial("goalMat", scene);
      goal.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
      goal.material.alpha = 0.3;
      goal.physicsImpostor = new BABYLON.PhysicsImpostor(
        goal,
        BABYLON.PhysicsImpostor.CylinderImpostor,
        { mass: 0 },
        scene
      );

      // Ball
      const ball = BABYLON.MeshBuilder.CreateSphere(
        "ball",
        { diameter: 0.5 },
        scene
      );
      ball.position = new BABYLON.Vector3(0, 2, 5);
      const ballMaterial = new BABYLON.StandardMaterial("ballMaterial", scene);
      ballMaterial.diffuseTexture = new BABYLON.Texture(
        "../src/assets/golf-ball.png",
        scene
      );
      ball.material = ballMaterial;

      ball.physicsImpostor = new BABYLON.PhysicsImpostor(
        ball,
        BABYLON.PhysicsImpostor.SphereImpostor,
        {
          mass: 0.1,
          friction: 0,
          restitution: 0.1,
          damping: 0.3,
          angularDamping: 1.0,
        },
        scene
      );

      // Arrow for direction indicator
      const arrow = BABYLON.MeshBuilder.CreateCylinder(
        "arrow",
        { diameterTop: 0, diameterBottom: 0.2, height: 2, tessellation: 96 },
        scene
      );
      arrow.rotation.x = Math.PI / 2;
      arrow.isVisible = false;

      // Check if the ball reaches the goal
      scene.registerBeforeRender(() => {
        const distanceToTrigger = BABYLON.Vector3.Distance(
          ball.position,
          goal.position
        );
        if (distanceToTrigger < 1.5 && ball.position.y < 1.5) {
          showFinishScreen();
        }

        const velocity = ball.physicsImpostor.getLinearVelocity();
        const speed = Math.sqrt(
          velocity.x * velocity.x +
            velocity.y * velocity.y +
            velocity.z * velocity.z
        );

        if (speed < 0.5) {
          ball.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
          ball.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
        }

        ball.physicsImpostor.setLinearVelocity(
          new BABYLON.Vector3(
            velocity.x * 0.95,
            velocity.y * 0.95,
            velocity.z * 0.95
          )
        );
      });

      return { scene, ball, camera, arrow };
    };

    const { scene, ball, camera, arrow } = createScene();

    engine.runRenderLoop(() => {
      scene.render();
      camera.setTarget(ball.position);
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });

    let isDragging = false;
    let dragStartPos = new BABYLON.Vector3();
    let dragEndPos = new BABYLON.Vector3();
    let dragDistance = 0;
    let score = 0;

    canvas.addEventListener("pointerdown", (evt) => {
      const pickResult = scene.pick(evt.clientX, evt.clientY);
      if (pickResult.hit && pickResult.pickedMesh === ball) {
        isDragging = true;
        dragStartPos.copyFrom(pickResult.pickedPoint);

        camera.lowerBetaLimit = camera.beta;
        camera.upperBetaLimit = camera.beta;
        camera.lowerRadiusLimit = camera.radius;
        camera.upperRadiusLimit = camera.radius;

        arrow.isVisible = true;
        arrow.position = ball.position;
        arrow.scaling.z = 0.1;
      }
    });

    canvas.addEventListener("pointermove", (evt) => {
      if (!isDragging) return;

      const pickResult = scene.pick(evt.clientX, evt.clientY);
      if (pickResult.hit) {
        dragEndPos.copyFrom(pickResult.pickedPoint);
        dragDistance = BABYLON.Vector3.Distance(dragStartPos, dragEndPos);
        const dragVector = dragStartPos.subtract(dragEndPos);
        dragVector.y = 0;

        arrow.position = ball.position;
        arrow.scaling.z = Math.min(dragDistance * 0.2, 5);
        arrow.rotation.y = Math.atan2(dragVector.x, dragVector.z);

        powerMeter = Math.min(dragDistance * 2, MAX_FORCE);
        updatePowerBar(powerMeter);
      }
    });

    canvas.addEventListener("pointerup", () => {
      if (isDragging) {
        isDragging = false;

        camera.lowerBetaLimit = null;
        camera.upperBetaLimit = null;
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 30;

        arrow.isVisible = false;

        const dragVector = dragStartPos.subtract(dragEndPos);
        dragVector.y = 0;
        const forceMagnitude = powerMeter;
        const forceDirection = dragVector.normalize();

        const force = forceDirection.scale(forceMagnitude);
        ball.physicsImpostor.applyImpulse(force, ball.getAbsolutePosition());

        score++;
        document.getElementById("score-info").innerText = `Shots: ${score}`;
        resetPowerBar();
      }
    });

    function showFinishScreen() {
      const finishScreen = document.getElementById("finish-screen");
      const finalScoreElement = document.getElementById("final-score");
      finalScoreElement.innerText = `Final Score: ${score} shots`;
      finishScreen.style.display = "block";
    }

    document.getElementById("play-again").addEventListener("click", () => {
      location.reload();
    });
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="renderCanvas"></canvas>
      <div id="hud">
        <div id="score-info">Shots: 0</div>
        <div id="power-bar-container">
          <div id="power-bar"></div>
        </div>
      </div>
      <div id="finish-screen">
        <h2>Goal Scored!</h2>
        <p id="final-score"></p>
        <button id="play-again">Play Again</button>
      </div>
    </>
  );
};

export default App;