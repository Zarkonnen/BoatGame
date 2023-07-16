function hwl(name, volume) {
    return new Howl({src: ["sounds/" + name + ".mp3", "sounds/" + name + ".mp3", "sounds/" + name + ".wav"], volume: volume || 1});
}

var sCoin = null
var sShip = null;
var sTake = null;
var sFanfare = null;

noise.seed(Math.random());

var mapThings = {
    forest1:[243,453,129,159],
    forest2:[494,412,140,100],
    forest3:[507,560,106,103],
    forest4:[749,541,73,67],
    rock1:[221,700,51,49],
    rock2:[211,779,56,59],
    rock3:[280,769,35,41],
    rock4:[311,831,41,33],
    rock5:[227,858,58,64],
    pit:[0,726,85,91],
    quarry:[51,863,88,83],
    field:[156,1008,77,78],
    dockV:[375,946,32,82],
    dockH:[440,959,88,29],
    house1:[1137,380,34,32],
    house2:[1193,392,47,35],
    house3:[1195,343,26,24],
    house4:[1233,344,26,24],
    house5:[1464,71,55,41],
    factory:[1144,279,91,44],
    fort:[1205,132,90,90],
    shipyard:[1153,0,118,90],
    mansion:[1337,18,80,75],
    tower:[1337,157,40,40],
    guardTower:[1382,106,40,40],
    lighthouse:[1408,164,33,33],
    greenhouse:[1588,132,86,83],
    island1:[1313,253,247,275],
    island2:[1630,464,418,435],
    island3:[1294,841,297,308],
    island4:[1031,524,374,320],
    island5:[629,1004,554,217],
    island6:[771,724,222,190],
    island7:[392,713,212,156]
};

var shipType = {
    Brig: {
        img: [657,41,83,68],
        cost: 80,
        motorSpeed: 0,
        turnSpeed: 0.003,
        windDrift: 0.02,
        sailSpeed: 0.3,
        maxTackStrength: 0.4,
        bestTackAngle: 90 * Math.PI / 180,
        maxTackAngle: 156 * Math.PI / 180,
        cargoCapacity: 3
    },
    Galleon: {
        img: [772,39,115,95],
        cost: 300,
        motorSpeed: 0,
        turnSpeed: 0.002,
        windDrift: 0.01,
        sailSpeed: 0.27,
        maxTackStrength: 0.4,
        bestTackAngle: 90 * Math.PI / 180,
        maxTackAngle: 156 * Math.PI / 180,
        cargoCapacity: 9
    },
    Dhow: {
        img: [638,154,83,55],
        cost: 120,
        motorSpeed: 0,
        turnSpeed: 0.004,
        windDrift: 0.02,
        sailSpeed: 0.4,
        maxTackStrength: 0.6,
        bestTackAngle: 100 * Math.PI / 180,
        maxTackAngle: 170 * Math.PI / 180,
        cargoCapacity: 3
    },
    Smuggler: {
        img: [738,199,61,42],
        cost: 80,
        motorSpeed: 0,
        turnSpeed: 0.006,
        windDrift: 0.04,
        sailSpeed: 0.45,
        maxTackStrength: 0.6,
        bestTackAngle: 100 * Math.PI / 180,
        maxTackAngle: 170 * Math.PI / 180,
        cargoCapacity: 2
    },
    "Steam Pinnace": {
        img: [810,175,61,25],
        cost: 200,
        motorSpeed: 0.15,
        turnSpeed: 0.003,
        windDrift: 0.04,
        sailSpeed: 0,
        maxTackStrength: 0,
        bestTackAngle: 0,
        maxTackAngle: 0,
        cargoCapacity: 2
    },
    Steamship: {
        img: [862,208,114,47],
        cost: 400,
        motorSpeed: 0.1,
        turnSpeed: 0.0025,
        windDrift: 0.01,
        sailSpeed: 0,
        maxTackStrength: 0,
        bestTackAngle: 0,
        maxTackAngle: 0,
        cargoCapacity: 7
    },
    Zeppelin: {
        img: [862,272,114,47],
        cost: 400,
        motorSpeed: 0.13,
        turnSpeed: 0.0016,
        windDrift: 0.1,
        sailSpeed: 0,
        maxTackStrength: 0,
        bestTackAngle: 0,
        maxTackAngle: 0,
        cargoCapacity: 5,
        flying: true
    },
};

var map = {};

function ajax(file, callback) {
	jQuery.ajax({
		url: file + "?" + (new Date()).getTime(),
		success: callback
	});
}

var ready = false;
var started = false;
var edit = false;
var collisionEdit = false;
var currentPolygon = null;

var scrollX = 0; scrollY = 0;
var scale = 1;
var editSel = null;
var playerShip = null;
var victory = false;
var goodsConfiscatedTimeout = 0;

ajax("map.json", function(data) {
    map = data;
    map.ships = [
        {
            type: "Brig",
            x: 50,
            y: 70,
            angle: 0,
            cargo: ["Lumber"],
            money: 12
        }
    ];
    map.time = 0;
    if (!map.collision) {
        map.collision = [];
    }
    playerShip = map.ships[0];
    ajax("ports.json", function(d2) {
        map.ports = d2.ports;
        ready = true;
    })
});

function inside(x, y, vs) {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html
    
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

function xWind(x, y) {
    return noise.simplex3((x) * 0.0001, (y) * 0.00002, map.time * 0.000002);
}

function yWind(x, y) {
    return noise.simplex3((x) * 0.0001, (y) * 0.00002, 1000 + map.time * 0.000002);
}

function windSpeed(x, y) {
    var xw = xWind(x, y);
    var yw = yWind(x, y);
    return Math.sqrt(xw * xw + yw * yw);
}

function windAngle(x, y) {
    return Math.atan2(yWind(x, y), xWind(x, y));
}

function tackAngle(ship) {
    var wa = windAngle(ship.x, ship.y);
    var sa = ship.angle;
    while (wa < 0) {
        wa += Math.PI * 2;
    }
    while (sa < 0) {
        sa += Math.PI * 2;
    }
    wa = wa % (Math.PI * 2);
    sa = sa % (Math.PI * 2);
    return Math.min(Math.abs(wa - sa), Math.PI * 2 - Math.abs(wa - sa));
}

function tackStrength(ship) {
    if (!shipType[ship.type].sailSpeed) { return 0; }
    var ta = tackAngle(ship);
    if (ta <= shipType[ship.type].bestTackAngle) {
        return shipType[ship.type].maxTackStrength;
    }
    if (ta <= shipType[ship.type].maxTackAngle) {
        return Math.min(shipType[ship.type].maxTackStrength, 1 - (ta - shipType[ship.type].bestTackAngle) / (shipType[ship.type].maxTackAngle - shipType[ship.type].bestTackAngle));
    }
    return 0;
}

function polyAvg(p) {
    var x = 0;
    var y = 0;
    p.forEach(pt => { x += pt[0]; y += pt[1]; });
    return [x / p.length, y / p.length];
}

function tick(ms) {
    map.time += ms;
    c.resetTransform();
    
    c.fillStyle = "#4884d4";
    c.fillRect(0, 0, canvas.width, canvas.height);
    if (!ready) { return; }
    
    if (!started) {
        if (click) {
            var music = hwl("music", 0.2);
            music.loop(true);
            music.play();
            started = true;
            sCoin = hwl("coin");
            sShip = hwl("ship");
            sTake = hwl("take");
            sFanfare = hwl("fanfare", 0.25);
        }
        
        c.fillStyle = "#ffe88c";
        c.font = "bold 100px sans-serif";
        c.fillText("Age of Merchants", 100, 130);
        c.font = "bold 20px sans-serif";
        c.fillText("Click to start", 100, 200);
        return;
    }
    
    if (victory) {
        c.fillStyle = "#ffe88c";
        c.font = "bold 100px sans-serif";
        c.fillText("Victory!", 100, 130);
        c.font = "bold 20px sans-serif";
        c.fillText("Reload to restart", 100, 200);
        return;
    }
    
    c.font = "bold 20px sans-serif";
    
    if (!edit) {
        scrollX = -playerShip.x + canvas.width / 2;
        scrollY = -playerShip.y + canvas.height / 2;
        c.strokeStyle = "#7cd8eb";
        for (var y = -3000; y < 3000; y += 200) {
            for (var x = -3000; x < 3000; x += 200) {
                if (x + scrollX < -50 || x + scrollX > canvas.width + 50 || y + scrollY < -50 || y + scrollY > canvas.height + 50) { continue; }
                var xw = xWind(x, y);
                var yw = yWind(x, y);
                c.beginPath();
                c.moveTo(x + scrollX, y + scrollY);
                c.lineTo(x + scrollX - xw * 40 + yw * 10, y + scrollY - yw * 40 - xw * 10);
                c.lineTo(x + scrollX - xw * 40 - yw* 10, y + scrollY - yw * 40 + xw * 10);
                c.lineTo(x + scrollX, y + scrollY);
                c.stroke();
            }
        }
    }
    
    c.scale(scale, scale);
    map.things.forEach(t => {
        if (t[0] == "lighthouse" && Math.abs(t[1] - playerShip.x) < 1500 && Math.abs(t[2] - playerShip.y) < 1100) {
            var angle = t[1] + map.time * 0.0002;
            c.fillStyle = "#ffe88c";
            c.beginPath();
            c.moveTo(t[1] + 16.5 + scrollX, t[2] + 16.5 + scrollY);
            c.arc(t[1] + 16.5 + scrollX, t[2] + 16.5 + scrollY, 500, angle, angle + Math.PI / 5);
            c.fill();
            if (Math.sqrt((t[1] + 16.5 - playerShip.x) * (t[1] + 16.5 - playerShip.x) + (t[2] + 16.5 - playerShip.y) * (t[2] + 16.5 - playerShip.y)) < 500) {
                var playerAngle = (Math.atan2(playerShip.y - 16.5 - t[2], playerShip.x - 16.5 - t[1]) + Math.PI * 2) % (Math.PI * 2);
                var obsAngle = (angle + Math.PI / 10) % (Math.PI * 2);
                var angleDiff = Math.min(Math.abs(playerAngle - obsAngle), Math.PI * 2 - Math.abs(playerAngle - obsAngle));
                if (angleDiff < Math.PI / 10 && playerShip.cargo.indexOf("Drugs") != -1) {
                    goodsConfiscatedTimeout = 5000;
                    sTake.play();
                    playerShip.cargo = playerShip.cargo.filter(o => { return o != "Drugs"; });
                }
            }
        }
    });
    map.things.forEach(t => {
        if (t[1] + scrollX < canvas.width && t[2] + scrollY < canvas.height && t[1] + scrollX + mapThings[t[0]][2] > 0 && t[2] + scrollY + mapThings[t[0]][3] > 0) {
            blit(mapThings[t[0]], t[1] + scrollX, t[2] + scrollY);
        }
    });
    map.ships.forEach(s => {
        blitRotated(shipType[s.type].img, s.x + scrollX, s.y + scrollY, s.angle);
    })
    var inPort = false;
    map.ports.forEach(p => {
        var isInside = inside(playerShip.x, playerShip.y, p.shape);
        c.fillStyle = isInside ? "#f3d040" : "#f2f2f0";
        var pt = polyAvg(p.shape);
        c.fillText(p.name, pt[0] + scrollX, pt[1] + scrollY);
        
        if (isInside) {
            c.fillStyle = "#f2f2f0";
            c.fillText(p.desc, pt[0] + scrollX, pt[1] + 30 + scrollY);
            inPort = true;
            var tx = pt[0] + scrollX;
            var ty = pt[1] + scrollY + 60;
            var keyI = 1;
            if (p.unlock) {
                var unlockable = playerShip.cargo.indexOf(p.unlock) != -1;
                c.fillStyle = unlockable ? "#f2f2f0" : "#b9b5c3";
                c.fillText(keyI + ": " + p.unlockDesc + " with 1 " + p.unlock, tx, ty);
                if (unlockable && pressed("" + keyI)) {
                    sCoin.play();
                    playerShip.cargo.splice(playerShip.cargo.indexOf(p.unlock), 1);
                    p.unlock = null;
                }
                ty += 30;
                keyI++;
            } else {
                p.goods.forEach(good => {
                    var buyable = playerShip.cargo.length < shipType[playerShip.type].cargoCapacity && playerShip.money >= good[1];
                    c.fillStyle = buyable ? "#f2f2f0" : "#b9b5c3";
                    c.fillText(keyI + ": Buy " + good[0] + " for $" + good[1], tx, ty);
                    if (buyable && pressed("" + keyI)) {
                        sCoin.play();
                        playerShip.cargo.push(good[0]);
                        playerShip.money -= good[1];
                    }
                    ty += 30;
                    keyI++;
                    var sellable = playerShip.cargo.indexOf(good[0]) != -1;
                    c.fillStyle = sellable ? "#f2f2f0" : "#b9b5c3";
                    c.fillText(keyI + ": Sell " + good[0] + " for $" + good[1], tx, ty);
                    if (sellable && pressed("" + keyI)) {
                        sCoin.play();
                        playerShip.cargo.splice(playerShip.cargo.indexOf(good[0]), 1);
                        playerShip.money += good[1];
                    }
                    ty += 30;
                    keyI++;
                });
                if (p.ship) {
                    var buyable = playerShip.type != p.ship && playerShip.money >= shipType[p.ship].cost && playerShip.cargo.length <= shipType[p.ship].cargoCapacity;
                    c.fillStyle = buyable ? "#f2f2f0" : "#b9b5c3";
                    c.fillText(keyI + ": Buy " + p.ship + " for $" + shipType[p.ship].cost, tx, ty);
                    if (buyable && pressed("" + keyI)) {
                        sShip.play();
                        playerShip.type = p.ship
                        playerShip.money -= shipType[p.ship].cost;
                    }
                    ty += 30;
                    keyI++;
                }
                if (p.canRetire) {
                    var retirable = playerShip.money >= 2000;
                    c.fillStyle = retirable ? "#f2f2f0" : "#b9b5c3";
                    c.fillText(keyI + ": Retire - $2000", tx, ty);
                    if (retirable && pressed("" + keyI)) {
                        sFanfare.play();
                        victory = true;
                    }
                    ty += 30;
                    keyI++;
                }
            }
        }
    });
    if (collisionEdit) {
        c.strokeStyle = "#f2f2f0";
        map.collision.forEach(p => {
            c.beginPath();
            c.moveTo(p[0][0] + scrollX, p[0][1] + scrollY);
            for (var i = 1; i < p.length; i++) {
                c.lineTo(p[i][0] + scrollX, p[i][1] + scrollY);
            }
            c.lineTo(p[0][0] + scrollX, p[0][1] + scrollY);
            c.stroke();
        });
        if (currentPolygon != null) {
            var p = currentPolygon;
            c.strokeStyle = "yellow";
            c.fillStyle = "yellow";
            c.beginPath();
            c.moveTo(p[0][0] + scrollX, p[0][1] + scrollY);
            for (var i = 1; i < p.length; i++) {
                c.lineTo(p[i][0] + scrollX, p[i][1] + scrollY);
            }
            c.lineTo(p[0][0] + scrollX, p[0][1] + scrollY);
            for (var i = 0; i < p.length; i++) {
                c.fillRect(p[i][0] + scrollX - 4, p[i][1] + scrollY - 4, 9, 9);
            }
            c.stroke();
        }
    }
    
    c.resetTransform();
    if (!edit) {
        if (down("A") || down("ArrowLeft")) {
            playerShip.angle -= ms * shipType[playerShip.type].turnSpeed;
        }
        if (down("D") || down("ArrowRight")) {
            playerShip.angle += ms * shipType[playerShip.type].turnSpeed;
        }
        var oldX = playerShip.x;
        var oldY = playerShip.y;
        if (down("W") || down("ArrowUp")) {
            var speed = tackStrength(playerShip) * windSpeed(playerShip.x, playerShip.y) * shipType[playerShip.type].sailSpeed + shipType[playerShip.type].motorSpeed;
            playerShip.x += Math.cos(playerShip.angle) * ms * speed;
            playerShip.y += Math.sin(playerShip.angle) * ms * speed;
        }
        if (!inPort) {
            playerShip.x += xWind(playerShip.x, playerShip.y) * shipType[playerShip.type].windDrift * ms;
            playerShip.y += yWind(playerShip.x, playerShip.y) * shipType[playerShip.type].windDrift * ms;
        }
        if (!shipType[playerShip.type].flying && map.collision.some(p => {
            return inside(playerShip.x, playerShip.y, p);
        })) {
            playerShip.x = oldX;
            playerShip.y = oldY;
        }
        // Bounds
        if (playerShip.x < -3000) {
            playerShip.x = -3000;
        }
        if (playerShip.x > 3000) {
            playerShip.x = 3000;
        }
        if (playerShip.y < -3000) {
            playerShip.y = -3000;
        }
        if (playerShip.y > 3000) {
            playerShip.y = 3000;
        }
        
        /*c.fillStyle = "white";
        c.fillText("Wind: " + Math.round(windAngle(playerShip.x, playerShip.y) * 180 / Math.PI) + ", Tack: " + Math.round(tackAngle(playerShip) * 180 / Math.PI) + ", Strength: " + tackStrength(playerShip), 10, 30);*/
        
        for (var i = 0; i < shipType[playerShip.type].cargoCapacity; i++) {
            c.fillStyle = "#76747d";
            c.fillRect(10 + i * 80, 10, 70, 70);
            c.fillStyle = "#f2f2f0";
            c.fillRect(12 + i * 80, 12, 66, 66);
            if (i < playerShip.cargo.length) {
                img(playerShip.cargo[i], 10 + i * 80, 10);
            }
        }
        c.fillText("$" + playerShip.money, 10 + shipType[playerShip.type].cargoCapacity * 80, 30);
        if (goodsConfiscatedTimeout > 0) {
            goodsConfiscatedTimeout -= ms;
            c.fillStyle = "#23213d";
            c.fillText("Illegal goods confiscated!", canvas.width / 2, canvas.height / 2 - 50);
        }
    } else {
        if (down("W") || down("ArrowUp")) {
            scrollY += ms * 0.5 / scale;
        }
        if (down("S") || down("ArrowDown")) {
            scrollY -= ms * 0.5 / scale;
        }
        if (down("A") || down("ArrowLeft")) {
            scrollX += ms * 0.5 / scale;
        }
        if (down("D") || down("ArrowRight")) {
            scrollX -= ms * 0.5 / scale;
        }
        if (pressed("V")) {
            console.log(JSON.stringify(map));
        }
        if (collisionEdit) {
            if (pressed("X")) {
                currentPolygon = null;
            }
            if (pressed("P") && currentPolygon && currentPolygon.length > 2) {
                map.collision.push(currentPolygon);
                currentPolygon = null;
            }
            if (click) {
                if (!currentPolygon) {
                    currentPolygon = [];
                }
                currentPolygon.push([click.x / scale - scrollX, click.y / scale - scrollY]);
            }
        } else {
            var x = 0;
            var y = 0;
            if (!editSel) {
                c.fillStyle = "white";
                c.fillRect(x, y, 40, 40);
            }
            if (click != null && click.x > x && click.y > y && click.x < x + 40 && click.y < y + 40) {
                editSel = null;
            }
            y += 40;
            for (n in mapThings) {
                if (click != null && click.x > x && click.y > y && click.x < x + 40 && click.y < y + 40) {
                    editSel = n;
                }
                if (n == editSel) {
                    c.fillStyle = "white";
                    c.fillRect(x, y, 40, 40);
                }
                blitScaled(mapThings[n], x, y, 40, 40);
                y += 40;
                if (y + 40 > canvas.height) {
                    x += 40;
                    y = 0;
                }
            }
            
            if (cursor.x > x + 40) {
                if (editSel) {
                    c.translate(cursor.x, cursor.y);
                    c.scale(scale, scale);
                    blit(mapThings[editSel], 0, 0);
                    c.resetTransform();
                    if (click && click.x > x + 40) {
                        map.things.push([editSel, click.x / scale - scrollX, click.y / scale - scrollY]);
                    }
                } else {
                    if (click && click.x > x + 40) {
                        for (var i = map.things.length - 1; i >= 0; i--) {
                            if (click.x / scale - scrollX > map.things[i][1] && click.y / scale - scrollY > map.things[i][2] && click.x / scale - scrollX < map.things[i][1] + mapThings[map.things[i][0]][2] && click.y / scale - scrollY < map.things[i][2] + mapThings[map.things[i][0]][3]) {
                                map.things.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}

var images = {};
var graphicsImg = null;

function blit(img, x, y) {
    if (!graphicsImg) {
        graphicsImg = new Image();
        graphicsImg.src = "graphics.png" + "?" + (new Date()).getTime();
    }
    c.drawImage(graphicsImg, img[0], img[1], img[2], img[3], x, y, img[2], img[3]);
}

function blitRotated(img, x, y, angle) {
    if (!graphicsImg) {
        graphicsImg = new Image();
        graphicsImg.src = "graphics.png" + "?" + (new Date()).getTime();
    }
    c.translate(x, y);
    c.rotate(angle);
    c.drawImage(graphicsImg, img[0], img[1], img[2], img[3], -img[2] / 2, -img[3] / 2, img[2], img[3]);
    c.rotate(-angle);
    c.translate(-x, -y);
}

function blitScaled(img, x, y, w, h) {
    if (!graphicsImg) {
        graphicsImg = new Image();
        graphicsImg.src = "graphics.png" + "?" + (new Date()).getTime();
    }
    c.drawImage(graphicsImg, img[0], img[1], img[2], img[3], x, y, w, h);
}

function img(img, x, y) {
    if (img == null) { return; }
    if (!images[img]) {
        images[img] = new Image();
        images[img].src = "graphics/" + img + ".png";
    }
    c.drawImage(images[img], x, y);
}

var canvas = document.getElementById("gameCanvas");
var c = canvas.getContext("2d");
var keys = {};
var keyCodes = {};
var keysDown = {};
var keyCodesDown = {};
var click = null;
var mouseDown = false;
var cursor = {x: 300, y: 300};

// Listen for key presses.
function canvasKeyUp(e) {
    keyCodes[e.key] = true;
    keys[String.fromCharCode(e.which)] = true;
    keyCodesDown[e.key] = false;
    keysDown[String.fromCharCode(e.which)] = false;
}

function canvasKeyDown(e) {
    keyCodesDown[e.key] = true;
    keysDown[String.fromCharCode(e.which)] = true;
}

function pressed(key) {
    return !!keys[key] || !!keyCodes[key];
}

function down(key) {
    return !!keysDown[key] || !!keyCodesDown[key];
}

$('body').keyup(canvasKeyUp).keydown(canvasKeyDown);

// Listen for mouse stuff.
function canvasClick(e) {
    click = { "x": e.offsetX, "y": e.offsetY };
}

function canvasMouseDown(e) {
    mouseDown = true;
}

function canvasMouseUp(e) {
    mouseDown = false;
}

function canvasMove(e) {
    cursor = { "x": e.offsetX, "y": e.offsetY };
}

$('#gameCanvas').click(canvasClick).mousemove(canvasMove).mousedown(canvasMouseDown).mouseup(canvasMouseUp);

// Set up game loop.
var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
var lastUpdate = new Date().getTime();

function nextFrame() {
    var currentTime = new Date().getTime();
    tick(currentTime - lastUpdate);
    keys = {};
    keyCodes = {};
    click = null;
    lastUpdate = currentTime;
    requestAnimationFrame(nextFrame);
}

// Once everything is set up, start game loop.
requestAnimationFrame(nextFrame);

jQuery(window).resize(function() {
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;
});
jQuery(window).ready(function() {
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 20;
});
 
/*canvas.addEventListener("click", function() {
    if (canvas.webkitRequestFullScreen) {
        canvas.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (canvas.mozRequestFullScreen) {
        canvas.mozRequestFullScreen();
    } else if (canvas.requestFullScreen) {
        canvas.requestFullScreen();
    }
});*/
