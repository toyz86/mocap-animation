import * as THREE from "three"; 
import { FBXLoader } from "jsm/loaders/FBXLoader.js";
import getLayer from "./libs/getLayer.js"; // Imports a custom function to add background sprites

// import { gsap } from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Initialize window width and height
const w = window.innerWidth;
const h = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
const path = "./assets/Y Bot.fbx"; 
// Global variables for character, mixer, and previousAction
let character, mixer, previousAction;

// Initialize scene data to track character and animations
const sceneData = {
  character: null,
  animations: [],
};

// Loader and manager for loading models and animations
const loader = new THREE.FBXLoader();
const manager = new THREE.LoadingManager();

// Load FBX character
loader.load('./assets/Y Bot.fbx', (fbx) => {
  character = fbx; // Assign loaded character to global variable
  character.scale.setScalar(0.1); // Scale character if needed
  sceneData.character = character; // Store character in sceneData
  
  mixer = new THREE.AnimationMixer(character); // Initialize mixer for character
  character.userData.mixer = mixer; // Attach mixer to character's userData

  // Load animations
  loader.load('./assets/Pushing.fbx', (anim) => {
    const animation = anim.animations[0]; // Load first animation clip
    sceneData.animations.push(animation); // Store animation in sceneData

    // Ensure everything is loaded before initializing the scene
    manager.onLoad = () => {
      initScene(sceneData); // Initialize scene after character and animations are loaded
    };
  });
});

// Setup actions for character animations
function setupActions(character, animations) {
  const actions = [];

  if (character.userData.mixer) {
    animations.forEach((anim) => {
      let action = character.userData.mixer.clipAction(anim); // Create action from animation clip
      actions.push(action); // Push each action to actions array
    });
  }
  
  return actions;
}

// Initialize the scene after character and animations are loaded
function initScene(sceneData) {
  const { character, animations } = sceneData;

  // Check if both character and animations are ready
  if (!character || animations.length === 0) return;

  // Setup actions for the character
  const actions = setupActions(character, animations);

  // Add character to scene
  scene.add(character);

  // Function to play specific animation action
  function playAnimation(actionName) {
    const action = actions.find((a) => a._clip.name === actionName); // Find matching action by name
    if (action && action !== previousAction) {
      if (previousAction) {
        previousAction.fadeOut(1); // Fade out previous action
      }
      action.reset(); // Reset the new action
      action.fadeIn(1).play(); // Fade in and play the new action
      previousAction = action; // Store current action as previousAction
    }
  }

  // ScrollTrigger logic to control animations based on scroll position
  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onEnter: () => playAnimation("Pushing"), // Trigger "Pushing" animation on scroll down
    onLeaveBack: () => playAnimation("Idle"), // Trigger "Idle" animation when scrolling back to top
    onUpdate: (self) => {
      if (self.direction === 1) {
        playAnimation("Pushing"); // Scroll down, play "Pushing"
      } else {
        playAnimation("Walking Backwards"); // Scroll up, play "Walking Backwards"
      }
    },
    onLeave: () => playAnimation("Idle"), // Trigger "Idle" animation when scrolling leaves viewport
  });

  // Start the render loop
  animate();
}

// Animation loop to update the scene and render
function animate() {
  requestAnimationFrame(animate); // Request the next frame
  if (mixer) {
    mixer.update(0.02); // Update the mixer for animations
  }
  renderer.render(scene, camera); // Render the scene
}
