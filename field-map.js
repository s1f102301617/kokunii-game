function drawFieldMap(canvas, sites, keySite) {
  const ink = canvas.getContext('2d');
  const x = value => 380 + value * 6.1;
  const y = value => 45 + (value + 82) * 2.85;
  let seed = 56242;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ink.fillStyle = '#cab994';
  ink.fillRect(0,0,760,440);
  for (let i=0; i<8500; i++) {
    ink.fillStyle = i%3 ? '#61492910' : '#fff7cf18';
    ink.fillRect(noise()*760,noise()*440,1+noise()*4,1+noise()*2);
  }
  ink.strokeStyle = '#7b654628';
  ink.beginPath(); ink.moveTo(248,0); ink.lineTo(252,440);
  ink.moveTo(0,216); ink.lineTo(760,219); ink.stroke();
  function line(points, color, width = 2) {
    ink.beginPath();
    points.forEach(([px,py],i) => {
      if (i) ink.lineTo(px,py); else ink.moveTo(px,py);
    });
    ink.strokeStyle = color;
    ink.lineWidth = width;
    ink.lineJoin = ink.lineCap = 'round';
    ink.stroke();
  }
  function label(text, px, py, tilt = 0, size = 22) {
    ink.save();
    ink.translate(px,py);
    ink.rotate(tilt);
    ink.fillStyle = '#312a24';
    ink.font = `${size}px "Yu Mincho", "Hiragino Mincho ProN", serif`;
    ink.fillText(text,0,0);
    ink.restore();
  }
  label('林道の見取り図',25,42,-.064,28);
  label('北 ↑',679,40,.05,20);
  for (const side of [-1,1]) {
    const sx=x(side*2.5);
    line([[sx,y(-49)],[sx+2,y(-17)],[sx-1,y(14)],[sx+1,y(42)],[sx,y(54)]],'#4e4332');
    line([[sx,y(-49)],[sx-1,y(-80)]],'#514236',3);
    for (let i=0; i<17; i++) {
      const tz=-41+noise()*88;
      const tx=side*(5+noise()*34);
      const px=x(tx), py=y(tz);
      line([[px-6,py+5],[px,py-6],[px+6,py+5],[px-6,py+5],[px,py+4],[px,py+9]],'#6f765453',1.4);
    }
  }
  line([[x(-3),y(-79.6)],[x(3),y(-79.6)]],'#813629',4);
  label('鉄格子・PC',417,62,.017);
  label('トンネル',416,125,-.03,19);
  const marks = [
    ['廃車・レバー',-154,24,-.03],
    ['井戸・ボタン',22,0,.045],
    ['作業跡・基板',-171,-7,-.027],
    ['作業箱・配線',25,6,.025]
  ];
  sites.forEach((site,i) => {
    const px=x(site.x), py=y(site.z);
    line([[px-7,py-7],[px+7,py+7]],'#863529',3);
    line([[px+6,py-7],[px-7,py+8]],'#863529',2.7);
    const [text,dx,dy,tilt]=marks[i];
    label(text,px+dx,py+dy,tilt,21);
  });
  const kx=x(keySite.x), ky=y(keySite.z);
  line([[kx,ky],[kx-32,ky-39],[kx-89,ky-38]],'#813629',2);
  label('鍵は車の脇',kx-155,ky-44,-.03,19);
  label('道路',x(0)-17,y(57),.03,17);
}
