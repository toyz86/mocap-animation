import * as THREE from "three"; 
import { FBXLoader } from "jsm/loaders/FBXLoader.js"; // Imports FBXLoader to load .fbx files
// import { OrbitControls } from "jsm/controls/OrbitControls.js"; // Imports OrbitControls for user-controlled camera movements
import getLayer from "./libs/getLayer.js"; // Imports a custom function to add background sprites

// Initialize window width and height
const w = window.innerWidth;
const h = window.innerHeight;

// Create a scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000); // Perspective camera with 75-degree field of view
camera.position.z = 5; // Camera is placed 5 units away from the scene
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Antialiasing for smoother visuals
renderer.setSize(w, h); // Sets renderer size to match the window dimensions
renderer.shadowMap.enabled = true; // Enable shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows
document.body.appendChild(renderer.domElement); // Attach the renderer to the document

// Enable orbit controls to allow camera movement with mouse
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true; // Smooth camera movement
// controls.dampingFactor = 0.05; // Damping factor for camera motion

// Loading manager and loaders for FBX model and textures
const manager = new THREE.LoadingManager();
const loader = new FBXLoader(manager); // Loader to load FBX models
const textureLoader = new THREE.TextureLoader(); // Loader to load textures
const path = "./assets/Y Bot.fbx"; // Path to the character model
let character;
const sceneData = {
  character: null,
  animations: [], // Object to store character and animation data
};

// Load the character model
loader.load(path, (fbx) => {

  // Function to create the material for the character's body using a matcap texture
  function getMaterial() {
    const material = new THREE.MeshMatcapMaterial({
      matcap: textureLoader.load("./assets/fire-edge-blue.jpg"), // Loads the texture for matcap effect
    });
    return material;
  }

  // Function to initialize the character's properties and scale
  function initCharacter(fbx) {
    const char = fbx;
    char.scale.setScalar(0.02); // Scale down the character
    char.position.set(0, -1.5, 0); // Position the character
    char.lookAt(new THREE.Vector3(-1,-1.5,0)); // Set Camera view
    char.traverse((c) => { // Traverse through the model components
      if (c.isMesh) { // If the component is a mesh
        if (c.material.name === "Alpha_Body_MAT") { // If it's the body material
          c.material = getMaterial(); // Apply custom material
        }
        c.castShadow = true; // Enable shadows for the character
      }
    });

    // Setup animation mixer for the character
    const mixer = new THREE.AnimationMixer(char);
    
    const update = (t) => {
      mixer.update(0.02); // Update animations with time
    };

    // Calculate the right edge of the viewport
    const fov = camera.fov * (Math.PI / 180); // Convert FOV to radians
    const height = 2 * Math.tan(fov / 2) * camera.position.z; // Visible height at the camera's position
    const width = height * camera.aspect; // Visible width based on the aspect ratio

    // Move the cube to the right edge of the viewport
    char.position.x = width / 2; // Move it to the right edge

    char.userData = { mixer, update }; // Store the mixer and update function in userData
    return char;
  }

  character = initCharacter(fbx); // Initialize the character
  sceneData.character = character; // Store the character in sceneData
});


// Animation names and their paths
const animations = [
  "Being Electrocuted", "Drunk Walk", "Floating", "Idle", "Joyful Jump",
  "Kneeling Pointing", "Low Crawl", "Male Dance Pose", "Neutral Idle",
  "Push Start", "Pushing", "Push Stop", "Reaction", "Spat In Face",
  "Stand To Roll", "Standard Walk", "Swimming", "Thriller Part 3",
  "Treading Water", "Walking", "Walking Backwards", "Waving", "Right Strafe Walk", "Walk Strafe Left", "Jump", "Standard Walk", "Sad Idle", "Walk Strafe Right",
];


const apath = "./assets/animations/"; // Path to the animations folder
manager.onLoad = () => initScene(sceneData); // Initialize scene after all assets are loaded
animations.forEach((name) => {
  loader.load(`${apath}${name}.fbx`, (fbx) => { // Load each animation
    let anim = fbx.animations[0]; // Take the first animation from the loaded file
    anim.name = name; // Name the animation
    sceneData.animations.push(anim); // Add animation to sceneData
  });
});

// Function to setup actions for each animation
function setupActions(character, animations) {
  const actions = [];
  animations.forEach((anim) => {
    let action = character.userData.mixer.clipAction(anim); // Create animation actions for the character
    actions.push(action);
  });
  return actions;
}

// Function to initialize the scene
function initScene(sceneData) {
  const { character, animations } = sceneData;
  const actions = setupActions(character, animations); // Setup actions for the character
  scene.add(character); // Add the character to the scene

  // Add a plane to serve as the ground
  const radius = 10;
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0x001020 }); // Dark-colored material for the ground
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI * -0.5; // Rotate the plane to lay flat
  plane.receiveShadow = true; // Enable shadow receiving
  plane.position.y = -1.5; // Position the plane slightly lower
  scene.add(plane);

  // Add directional light to simulate sunlight
  const sunLight = new THREE.DirectionalLight(0xffffff, 5);
  sunLight.position.set(2, 4, 3);
  sunLight.castShadow = true; // Enable casting shadows
  scene.add(sunLight);

  // Add background sprites using the getLayer function
  const sprites = getLayer({
    hue: 0.58,
    numSprites: 8,
    opacity: 0.2,
    radius: 10,
    size: 24,
    z: -10.5,
  });
  scene.add(sprites);

  let timeElapsed = 0;

  // Function to animate the scene
  function animate(t = 0) {
    timeElapsed += 0.01;
    requestAnimationFrame(animate); // Request the next frame

    character?.userData.update(timeElapsed); // Update the character animations
    renderer.render(scene, camera); // Render the scene
    // controls.update(); // Update camera controls
  }

  let index = 2; // Initial animation index
  let previousAction;
  // animate(); // Start the animation loop

  // Handle window resize to adjust camera and renderer size
  function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", handleWindowResize, false); // Add event listener for window resize

  let currentKey = null;

  const keyToAnimationMap = {
    w: "Pushing",
    s: "Walking Backwards", // You can map this to any other animation
    a: "Walk Strafe Left", // Example: left arrow triggers waving animation
    d: "Walk Strafe Right", // Example: right arrow triggers jump animation
    v: "Idle"
  };

  function moveCharacter(key) {
    const moveSpeed = 0.02; // Adjust the speed of movement
    if (key === "w" || key === "ArrowLeft") {
      // Move left
      character.position.x -= moveSpeed;
  
      // Calculate the left edge of the screen in world coordinates
      const leftEdge = -camera.aspect * camera.position.z * Math.tan(camera.fov / 2 * Math.PI / 180);
      
      // If the character hits the left edge, reset its position to the right
      if (character.position.x < leftEdge) {
        const rightEdge = camera.aspect * camera.position.z * Math.tan(camera.fov / 2 * Math.PI / 180);
        character.position.x = rightEdge;
      }
    }
  }
  
  // Function to play animation based on the key pressed
  function playAnimationByKey(key) {
    const animationName = keyToAnimationMap[key]; // Get the animation name from the key mapping
    if (animationName) {
      const action = actions.find(a => a._clip.name === animationName); // Find the corresponding action by animation name
      if (action && action !== previousAction) {
        previousAction?.fadeOut(1); // Fade out the previous action if it exists
        action.reset(); // Reset the new action
        action.fadeIn(1); // Fade in the new action
        action.play(); // Play the new action
        previousAction = action; // Set the previous action for future reference
      }
    }
  }  
  animate(playAnimationByKey("v")); // Start the animation loop

  window.addEventListener("keydown", (e) => {
    if (e.key !== currentKey) { // Only start animation if it's a new key press
      currentKey = e.key;
      moveCharacter(e.key); // Call the movement function
      playAnimationByKey(e.key);
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === currentKey) { // Stop animation only if it's the key that was held down
      currentKey = null;
      stopAnimation();
    }
  });


  function stopAnimation() {
    if (previousAction) {
      previousAction.fadeOut(1); // Fade out the current action
      previousAction = null;
    }
    playAnimationByKey("v"); // Default to Idle animation (mapped to "s" in your keyToAnimationMap)
  }

  function animateMovement() {
    requestAnimationFrame(animateMovement);
    if (currentKey) {
      moveCharacter(currentKey);
    }
    renderer.render(scene, camera); // Continue rendering the scene
    // controls.update(); // Update camera controls
  }  

  animateMovement(); // Start the animation loop for movement
}