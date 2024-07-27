const canvas = document.getElementById('fishCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let mouseX = 0;
let mouseY = 0;
let mouseRadius = 100; // 鼠标影响范围，小鱼在范围内会试图逃跑

let fishingNet;

function updateFishingNetPosition() {
  fishingNet.x = mouseX;
  fishingNet.y = mouseY;
}

function drawFishingNet() {
  fishingNet.draw();
}

document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

// 鱼饵类
class Bait {
  constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.size = 5; // 鱼饵大小
      this.color = 'yellow'; // 鱼饵颜色
      this.type = type || 1; // 1 普通鱼饵 2 鱼竿鱼饵
  }

  draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.stroke();
  }
}

function spawnBait() {
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height;
  const newBait = new Bait(x, y);
  baits.push(newBait);
}

// 渔网类
class FishingNet {
  constructor(x, y, radius) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.meshSize = 10; // 网格大小
  }

  draw() {
      ctx.beginPath();
      for (let i = -this.radius; i <= this.radius; i += this.meshSize) {
          ctx.moveTo(this.x + i, this.y - this.radius);
          ctx.lineTo(this.x + i, this.y + this.radius);
          ctx.moveTo(this.x - this.radius, this.y + i);
          ctx.lineTo(this.x + this.radius, this.y + i);
      }
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
  }
}

class Fish {
    constructor() {
        this.id = Math.random().toString(36).substr(2, 9); // 生成一个随机的 id
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = 10 + Math.random() * 20; // 随机大小，范围在10到30之间
        this.speed = 0.5 + Math.random() * 1.5; // 随机速度，范围在0.5到2之间
        this.baseSpeed = this.speed;
        this.direction = Math.random() * 2 * Math.PI;
        this.targetDirection = this.direction;
        this.color = this.getRandomColor();
        this.escaping = false;
        this.blinkTimer = 0;
        this.blinkInterval = 100 + Math.random() * 2000; // 随机的眨眼时间间隔，范围在100ms到2100ms之间
        this.eyeClosed = false;
        this.isHooked = false; // 被鱼钩抓住
        this.struggleTimer = 0; // 挣扎计时器
        this.struggleInterval = 10; // 挣扎时间间隔
        this.caughtTimer = 0; // 被抓住计时器
        this.escapeChance = 1; // 挣脱几率
        this.escapeInterval = 100; // 挣脱时间间隔
    }

    getRandomColor() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `rgb(${r}, ${g}, ${b})`;
    }

    avoidCollision(otherFish) {
      const dx = this.x - otherFish.x;
      const dy = this.y - otherFish.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果距离太近，就改变方向，避免碰撞
      if (distance < this.size * 2) {
          const avoidAngle = Math.atan2(dy, dx);
          this.targetDirection = avoidAngle + Math.PI; // 改变方向为与其他鱼相反
      }
    }

    update(predator, otherFishes, baits) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (this.isHooked) {
            this.caughtTimer++;
            if (this.caughtTimer >= this.escapeInterval && Math.random() < this.escapeChance) {
              console.log("挣脱了");
              this.isHooked = false; // 有一定几率挣脱
            }

            this.struggleTimer++;
            if (this.struggleTimer >= this.struggleInterval) {
                this.struggleTimer = 0;
                this.targetDirection = Math.random() * 10 * Math.PI; // 随机改变方向

                const turnRate = 1;
                this.direction += (this.targetDirection - this.direction) * turnRate;
            }
            return;
        }

        if (distance < mouseRadius) {
            // 小鱼靠近鼠标，试图逃跑
            this.escaping = true;
            this.targetDirection = Math.atan2(dy, dx);
            this.speed = 2.5; // 增加速度以逃跑
        } else {
            // 小鱼不逃跑
            this.escaping = false;
            this.speed = this.baseSpeed; // 重置为正常速度
        }

        if (predator) {
            if (predator.enable) {
                const pdx = this.x - predator.x;
                const pdy = this.y - predator.y;
                const pdistance = Math.sqrt(pdx * pdx + pdy * pdy);

                if (pdistance < predator.size) {
                    if (Math.random() < 0.9) {
                        // 50%的机会逃跑
                        this.escaping = true;
                        this.targetDirection = Math.atan2(pdy, pdx);
                        this.speed = 3; // 增加速度以逃跑
                    } else {
                        // 被捕食者抓住
                        this.caught = true;
                        predator.size = predator.size + 1;
                    }
                }
            }
        }

        // 平滑过渡到目标方向
        const turnRate = this.escaping ? 0.2 : 0.05; // 逃跑时转向速度更快
        this.direction += (this.targetDirection - this.direction) * turnRate;

        this.x += Math.cos(this.direction) * this.speed;
        this.y += Math.sin(this.direction) * this.speed;

        // 边界反弹
        if (this.x < 0 || this.x > canvas.width) {
            this.direction = Math.PI - this.direction;
            this.targetDirection = this.direction;
        }

        if (this.y < 0 || this.y > canvas.height) {
            this.direction = -this.direction;
            this.targetDirection = this.direction;
        }

        // 如果不逃跑，随机改变目标方向
        if (!this.escaping && Math.random() < 0.01) {
            this.targetDirection += (Math.random() - 0.5) * Math.PI / 2;
        }

        // 检查与其他鱼的碰撞并进行避让
        for (let i = 0; i < otherFishes.length; i++) {
          if (otherFishes[i] !== this) {
              // this.avoidCollision(otherFishes[i]);
          }
        }

        // 如果有鱼饵，小鱼会靠近鱼饵
        if (baits.length > 0) {
          let closestBait = null;
          let closestDistance = Number.MAX_SAFE_INTEGER;

          for (let i = 0; i < baits.length; i++) {
              const currentBait = baits[i];
              const dx = this.x - currentBait.x;
              const dy = this.y - currentBait.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < closestDistance) {
                  closestBait = currentBait;
                  closestDistance = distance;
              }
          }

          if (closestBait) {
              const dx = closestBait.x - this.x;
              const dy = closestBait.y - this.y;
              const angle = Math.atan2(dy, dx);
              this.targetDirection = angle;
              
              // 如果小鱼靠近了鱼饵，就吃掉它并重新校准方向
              const eatDistance = 20; // 小鱼吃鱼饵的距离阈值
              if (closestDistance < eatDistance) {
                  baits.splice(baits.indexOf(closestBait), 1); // 从鱼饵列表中移除被吃掉的鱼饵
                  this.targetDirection = Math.random() * Math.PI * 2; // 吃掉鱼饵后重新校准方向
                  if (closestBait.type == 2) {
                    console.log(this.id + "被鱼钩抓住了");
                    this.isHooked = true;
                  }
              }
          }
      }

      // 眨眼逻辑
      this.blinkTimer++;
      if (this.blinkTimer > this.blinkInterval) {
          this.eyeClosed = !this.eyeClosed;
          this.blinkTimer = 0;
          this.blinkInterval = this.eyeClosed ? 10 : 100 + Math.random() * 1000; // 重置眨眼时间间隔，闭眼时间隔较短
      }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.direction);

        // 绘制小鱼身体
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // 绘制小鱼尾巴
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(-this.size - 10, -5);
        ctx.lineTo(-this.size - 10, 5);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // 绘制小鱼眼睛
        const eyeOffsetX = this.size / 2;
        const eyeOffsetY = -this.size / 4;
        const eyeRadius = this.size / 8;

        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.arc(eyeOffsetX, eyeOffsetY * i, eyeRadius, 0, 2 * Math.PI);
          ctx.fillStyle = 'white';
          ctx.fill();
          ctx.stroke();
  
          // 绘制小鱼瞳孔或闭眼
          if (this.eyeClosed) {
              ctx.beginPath();
              ctx.moveTo(eyeOffsetX - eyeRadius, eyeOffsetY * i);
              ctx.lineTo(eyeOffsetX + eyeRadius, eyeOffsetY * i);
              ctx.strokeStyle = 'black';
              ctx.stroke();
          } else {
              ctx.beginPath();
              ctx.arc(eyeOffsetX, eyeOffsetY * i, eyeRadius / 2, 0, 2 * Math.PI);
              ctx.fillStyle = 'black';
              ctx.fill();
          }
      }
  
      ctx.restore();
  }

}

class PredatorFish extends Fish {
  constructor() {
      super();
      this.size = 30; // 捕食者鱼的体积较大
      this.color = 'black'; // 捕食者鱼的颜色不同
      this.enable = false; // 是否启用
  }

  update(fishes) {
      if (this.enable === false) {
        return;
      }
      // 找到最近的小鱼
      let closestFish = null;
      let minDistance = Infinity;

      fishes.forEach(fish => {
          const dx = this.x - fish.x;
          const dy = this.y - fish.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
              minDistance = distance;
              closestFish = fish;
          }
      });

      if (closestFish) {
          this.targetDirection = Math.atan2(closestFish.y - this.y, closestFish.x - this.x);
      }

      // 平滑过渡到目标方向
      const turnRate = 0.1;
      this.direction += (this.targetDirection - this.direction) * turnRate;

      this.x += Math.cos(this.direction) * this.speed;
      this.y += Math.sin(this.direction) * this.speed;

      // 边界反弹
      if (this.x < 0 || this.x > canvas.width) {
          this.direction = Math.PI - this.direction;
          this.targetDirection = this.direction;
      }

      if (this.y < 0 || this.y > canvas.height) {
          this.direction = -this.direction;
          this.targetDirection = this.direction;
      }

      // 眨眼逻辑
      this.blinkTimer++;
      if (this.blinkTimer > this.blinkInterval) {
          this.eyeClosed = !this.eyeClosed;
          this.blinkTimer = 0;
          this.blinkInterval = this.eyeClosed ? 10 : 100 + Math.random() * 1000; // 重置眨眼时间间隔，闭眼时间隔较短
      }
  }

  draw() {
      if (this.enable === false) {
          return;
      }
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.direction);

      // 绘制捕食者鱼身体，考虑大小
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, 2 * Math.PI);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.stroke();

      // 绘制捕食者鱼尾巴
      ctx.beginPath();
      ctx.moveTo(-this.size, 0);
      ctx.lineTo(-this.size - 10, -5);
      ctx.lineTo(-this.size - 10, 5);
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.stroke();

      // 绘制捕食者鱼眼睛，红色
      const eyeOffsetX = this.size / 2;
      const eyeOffsetY = -this.size / 4;
      const eyeRadius = this.size / 8;

      for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.arc(eyeOffsetX, eyeOffsetY * i, eyeRadius, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
          ctx.stroke();

          // 绘制捕食者鱼的瞳孔或闭眼
          if (this.eyeClosed) {
              ctx.beginPath();
              ctx.moveTo(eyeOffsetX - eyeRadius, eyeOffsetY * i);
              ctx.lineTo(eyeOffsetX + eyeRadius, eyeOffsetY * i);
              ctx.strokeStyle = 'black';
              ctx.stroke();
          } else {
              ctx.beginPath();
              ctx.arc(eyeOffsetX, eyeOffsetY * i, eyeRadius / 2, 0, 2 * Math.PI);
              ctx.fillStyle = 'black';
              ctx.fill();
          }
      }

      ctx.restore();
  }

}

// 钓鱼线类
class FishingLine {
  constructor(startX, startY, endX, endY) {
      this.startX = startX;
      this.startY = startY;
      this.endX = endX;
      this.endY = endY;
  }

  draw() {
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.endX, this.endY);
      ctx.strokeStyle = 'black';
      ctx.stroke();
  }
}

const baits = [];
const fishes = [];
let fishingMode = false;
let fishingLine; 
let fishBait;
let fishCaughtCount = 0;

for (let i = 0; i < 100; i++) {
    fishes.push(new Fish());
}

const predator = new PredatorFish();
// predator.enable = true;

// 在屏幕左上角显示“已捕捞 0”的文本
function drawFishCount() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "black";
  ctx.fillText("已捕捞 " + fishCaughtCount, 10, 30);
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawFishCount()

  // updateFishingNetPosition();
  // drawFishingNet();

  predator.update(fishes);
  predator.draw();

  for (let i = baits.length - 1; i >= 0; i--) {
    baits[i].draw();
  }

  for (let i = fishes.length - 1; i >= 0; i--) {
    fishes[i].update(predator, fishes, baits);
    if (fishes[i].caught) {
        fishes.splice(i, 1); // 移除被捕食者吃掉的小鱼
    } else {
        fishes[i].draw();
    }
  }

  // 画钓鱼线
  if (fishingMode && fishingLine) {
    fishingLine.draw();
  }

  requestAnimationFrame(animate);
}

// 初始化渔网
function initFishingNet() {
  fishingNet = new FishingNet(mouseX, mouseY, 50);
}

// initFishingNet();
animate();

// function spawnFish() {
//   let size = Math.random() * 20 + 10; // 随机大小
//   let x = Math.random() * canvas.width;
//   let y = Math.random() * canvas.height;
//   let newFish = new Fish(x, y, size);
//   fishes.push(newFish);
// }

// 监听“投放小鱼”按钮的点击事件
document.getElementById('addFishButton').addEventListener('click', () => {
  fishes.push(new Fish());
});

// 监听“投放鱼饵”按钮的点击事件
document.getElementById('addBaitButton').addEventListener('click', () => {
  spawnBait();
});

// 监听“钓鱼”按钮的点击事件
document.getElementById('fishingButton').addEventListener('click', function() {
  console.log('点击钓鱼');

  if (fishingMode) {
    fishingMode = false;
    fishingLine = "";
    baits.splice(baits.indexOf(fishBait), 1);
    this.innerText = "开始钓鱼";
  } else {
    fishingLine = function() {
      const lineWidth = 8; // 钓鱼线的宽度
      const lineX = canvas.width / 2 - lineWidth / 2; // 计算线的横坐标，使其居中
      const lineEndY = Math.random() * canvas.height; // 随机线的终点纵坐标
      const lineEndX = lineX; // 线的终点横坐标与起点相同
      fishBait = new Bait(lineEndX, lineEndY, 2);
      baits.push(fishBait);
      return new FishingLine(lineX, 0, lineEndX, lineEndY);
    }()

    fishingMode = true;
    this.innerText = "取消钓鱼";
  }
});
