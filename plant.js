const plant = document.getElementById("plant");

let x = 0;
let velocity = 2.6;
let tilt = 0;

function animate() {
  const maxOffset = Math.max(90, window.innerWidth / 2 - 120);

  x += velocity;

  if (x > maxOffset || x < -maxOffset) {
    velocity *= -1;
  }

  tilt = velocity > 0 ? 3 : -3;
  plant.style.setProperty("--x", `${x}px`);
  plant.style.setProperty("--tilt", `${tilt}deg`);

  requestAnimationFrame(animate);
}

animate();
