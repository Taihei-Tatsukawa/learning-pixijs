async function init() {
  //パーリンノイズの初期化
  noise.seed(Date.now());

  const image = new Image();
  image.src = "./images/sample.png";
  await image.decode();

  // PixiJSの初期化
  const app = new PIXI.Application({
    backgroundColor: 0xffffff,
    resolution: window.devicePixelRatio,
    width: image.width,
    height: image.height,
    view: document.querySelector("#myCanvas"),
  });
  app.view.style.width = "100%";
  app.view.style.height = "100%";

  // ドットサイズの大きさ
  const DOT_SIZE = 2;

  //画像サイズ
  const imageW = image.width;
  const imageH = image.height;
  const lengthW = imageW / DOT_SIZE;
  const lengthH = imageH / DOT_SIZE;

  // コンテナーの作成
  // パフォーマンス重視でパーティクルコンテナーを使用
  const container = new PIXI.ParticleContainer(lengthW * lengthH, {
    scale: true,
    position: true,
    alpha: true,
  });
  app.stage.addChild(container);

  // テクスチャ作成
  // テクスチャ1枚にするとパフォーマンスにとてもいい
  const texture = PIXI.Texture.from(image);

  //画像をメモリ上のcanvasに描画
  const canvas = document.createElement("canvas");
  canvas.width = imageW;
  canvas.height = imageH;
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });
  context.drawImage(image, 0, 0);

  /**
   * パーティクル生成
   */

  //画像のピクセルデータを取得
  const dots = [];

  let startTime = performance.now();

  for (let i = 0; i < lengthW * lengthH; i++) {
    const x = (i % lengthW) * DOT_SIZE;
    const y = Math.floor(i / lengthW) * DOT_SIZE;

    const dotData = context.getImageData(
      x + Math.floor(DOT_SIZE / 2),
      y + Math.floor(DOT_SIZE / 2),
      1,
      1
    );

    // 透過度が0の場合は無視
    const alpha = dotData.data[3];

    if (alpha === 0) {
      continue;
    }

    const texture2 = new PIXI.Texture(
      texture,
      new PIXI.Rectangle(x, y, DOT_SIZE, DOT_SIZE)
    );

    const dot = new Dot(texture2);

    dot.anchor.set(0.5);
    dot.x = x - imageW / 2;
    dot.y = y - imageH / 2;
    dot.alpha = alpha / 255; //元画像の透明度を反映
    dot.tint = 0x000000;
    container.addChild(dot);

    //パーティクルにXYの算出元番号を保存
    dot.offsetIndex = i;

    // 配列に保存
    dots.push(dot);
  }

  let endTime = performance.now();
  console.log("ピクセルデータ取得 " + (endTime - startTime) + " milliseconds.");

  // GSSAPのタイムライン作成(各トゥイーンを集約)
  const tl = gsap.timeline({ repeat: -1 });

  // 画面サイズ
  const stageW = app.screen.width;
  const stageH = app.screen.height;

  startTime = performance.now();

  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i];

    const index = dot.offsetIndex;

    // XとYを正規化
    // nxは左辺を基準に0.0〜1.0の値をとる
    const nx = (index % lengthW) / lengthW;
    // nyは上辺を基準に0.0〜1.0の値をとる
    const ny = Math.floor(index / lengthW) / lengthH;

    //パーリンノイズでパーティクルの移動座標を決める
    const px = noise.perlin2(nx * 3, ny * 2);
    const py = noise.perlin2(nx * 2, ny * 4);

    // 画面左端から遅延
    const delay = nx * 1.0;

    // 画面左端から拡散度合いを強くする
    const spread = (1 - nx) * 100 + 100;

    // 追加で乱数で拡散
    const x = stageW * px + Math.random() * spread;
    const y = stageH * py + Math.random() * spread;

    tl.from(
      dot,
      {
        x: x,
        y: y,
        duration: 4,
        ease: "expo.inOut",
      },
      delay
    );
  }

  endTime = performance.now();
  console.log(
    "ピクセルデータにトゥイーンを設定 " +
      (endTime - startTime) +
      " milliseconds."
  );

  tl.add(() => {}, "+=0.5");

  const resize = () => {
    container.x = app.screen.width / 2;
    container.y = app.screen.height / 2;
  };
  window.addEventListener("resize", resize);
  resize();
}

class Dot extends PIXI.Sprite {
  constructor(texture) {
    super(texture);
  }
  get scaleX() {
    return this.scale.x;
  }
  set scaleX(value) {
    this.scale.x = value;
  }
  get scaleY() {
    return this.scale.y;
  }
  set scaleY(value) {
    this.scale.y = value;
  }
  offsetIndex = -1;
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
