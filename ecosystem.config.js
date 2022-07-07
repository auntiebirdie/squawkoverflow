module.exports = {
  apps: [{
      name: "squawk",
      script: "app.js",
      instances: 2,
      exec_mode: "cluster"
    },
    {
      name: "bugs",
      script: "bugs.js",
      instances: 1
    }
  ]
}
