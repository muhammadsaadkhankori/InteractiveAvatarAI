import React, { useRef, useEffect, useState } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { useFrame } from "@react-three/fiber";
import { button, useControls } from "leva";
import * as THREE from "three";
import { useSpeech } from "../hooks/useSpeech";
import facialExpressions from "../constants/facialExpressions";
import visemesMapping from "../constants/visemesMapping";
import morphTargets from "../constants/morphTargets";

const AVATAR_PATH = '/models/profavatar.glb';

export function Avatar(props) {
  const group = useRef();
  const { nodes, materials } = useGLTF(AVATAR_PATH);
  const { animations } = useGLTF("/models/animations.glb");
  const { actions, mixer } = useAnimations(animations, group);
  const { message, onMessagePlayed } = useSpeech();
  const [lipsync, setLipsync] = useState();
  const [setupMode, setSetupMode] = useState(false);
  const [animation, setAnimation] = useState(animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name);
  const [blink, setBlink] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");
  const [audio, setAudio] = useState();

  console.log("Nodes:", nodes);
  console.log("Materials:", materials);
  console.log("Animations:", animations);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    group.current.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index === undefined || child.morphTargetInfluences[index] === undefined) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(child.morphTargetInfluences[index], value, speed);
      }
    });
  };

  useEffect(() => {
    if (!message) {
      setAnimation("Idle");
      return;
    }
    setAnimation(message.animation);
    setFacialExpression(message.facialExpression);
    setLipsync(message.lipsync);
    const audio = new Audio("data:audio/mp3;base64," + message.audio);
    audio.play();
    setAudio(audio);
    audio.onended = onMessagePlayed;
  }, [message]);

  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        .reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();
      return () => {
        if (actions[animation]) {
          actions[animation].fadeOut(0.5);
        }
      };
    }
  }, [animation]);

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  useFrame(() => {
    !setupMode &&
      morphTargets.forEach((key) => {
        const mapping = facialExpressions[facialExpression];
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return;
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });

    lerpMorphTarget("eyeBlinkLeft", blink ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink ? 1 : 0, 0.5);

    if (setupMode) {
      return;
    }

    const appliedMorphTargets = [];
    if (message && lipsync) {
      const currentAudioTime = audio.currentTime;
      for (let i = 0; i < lipsync.mouthCues.length; i++) {
        const mouthCue = lipsync.mouthCues[i];
        if (currentAudioTime >= mouthCue.start && currentAudioTime <= mouthCue.end) {
          appliedMorphTargets.push(visemesMapping[mouthCue.value]);
          lerpMorphTarget(visemesMapping[mouthCue.value], 1, 0.2);
          break;
        }
      }
    }

    Object.values(visemesMapping).forEach((value) => {
      if (appliedMorphTargets.includes(value)) {
        return;
      }
      lerpMorphTarget(value, 0, 0.1);
    });
  });

  useControls("FacialExpressions", {
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    setupMode: button(() => {
      setSetupMode(!setupMode);
    }),
    logMorphTargetValues: button(() => {
      const emotionValues = {};
      Object.values(nodes).forEach((node) => {
        if (node.morphTargetInfluences && node.morphTargetDictionary) {
          morphTargets.forEach((key) => {
            if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
              return;
            }
            const value = node.morphTargetInfluences[node.morphTargetDictionary[key]];
            if (value > 0.01) {
              emotionValues[key] = value;
            }
          });
        }
      });
      console.log(JSON.stringify(emotionValues, null, 2));
    }),
  });

  useControls("MorphTarget", () =>
    Object.assign(
      {},
      ...morphTargets.map((key) => {
        return {
          [key]: {
            label: key,
            value: 0,
            min: 0,
            max: 1,
            onChange: (val) => {
              lerpMorphTarget(key, val, 0.1);
            },
          },
        };
      })
    )
  );

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        geometry={nodes.Body_Mesh.geometry}
        material={materials.Body}
        skeleton={nodes.Body_Mesh.skeleton}
      />
      <skinnedMesh
        name="Eye_Mesh"
        geometry={nodes.Eye_Mesh.geometry}
        material={materials.Eyes}
        skeleton={nodes.Eye_Mesh.skeleton}
        morphTargetDictionary={nodes.Eye_Mesh.morphTargetDictionary}
        morphTargetInfluences={nodes.Eye_Mesh.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeAO_Mesh"
        geometry={nodes.EyeAO_Mesh.geometry}
        material={materials.EyeAO}
        skeleton={nodes.EyeAO_Mesh.skeleton}
        morphTargetDictionary={nodes.EyeAO_Mesh.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeAO_Mesh.morphTargetInfluences}
      />
      <skinnedMesh
        name="Eyelash_Mesh"
        geometry={nodes.Eyelash_Mesh.geometry}
        material={materials.Eyelash}
        skeleton={nodes.Eyelash_Mesh.skeleton}
        morphTargetDictionary={nodes.Eyelash_Mesh.morphTargetDictionary}
        morphTargetInfluences={nodes.Eyelash_Mesh.morphTargetInfluences}
      />
      <skinnedMesh
        name="Head_Mesh"
        geometry={nodes.Head_Mesh.geometry}
        material={materials.Head}
        skeleton={nodes.Head_Mesh.skeleton}
        morphTargetDictionary={nodes.Head_Mesh.morphTargetDictionary}
        morphTargetInfluences={nodes.Head_Mesh.morphTargetInfluences}
      />
      <skinnedMesh
        name="Teeth_Mesh"
        geometry={nodes.Teeth_Mesh.geometry}
        material={materials.Teeth}
        skeleton={nodes.Teeth_Mesh.skeleton}
        morphTargetDictionary={nodes.Teeth_Mesh.morphTargetDictionary}
        morphTargetInfluences={nodes.Teeth_Mesh.morphTargetInfluences}
      />
      <skinnedMesh
        name="Tongue_Mesh"
        geometry={nodes.Tongue_Mesh.geometry}
        material={materials.Teeth}
        skeleton={nodes.Tongue_Mesh.skeleton}
        morphTargetDictionary={nodes.Tongue_Mesh.morphTargetDictionary}
        morphTargetInfluences={nodes.Tongue_Mesh.morphTargetInfluences}
      />
      <skinnedMesh
        geometry={nodes.avaturn_hair_0.geometry}
        material={materials.avaturn_hair_0_material}
        skeleton={nodes.avaturn_hair_0.skeleton}
      />
      <skinnedMesh
        geometry={nodes.avaturn_shoes_0.geometry}
        material={materials.avaturn_shoes_0_material}
        skeleton={nodes.avaturn_shoes_0.skeleton}
      />
      <skinnedMesh
        geometry={nodes.avaturn_look_0.geometry}
        material={materials.avaturn_look_0_material}
        skeleton={nodes.avaturn_look_0.skeleton}
      />
    </group>
  )
}

useGLTF.preload(AVATAR_PATH)