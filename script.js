// Mini Minecraft - Script Principal con Personaje y Herramientas
class MinecraftGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = [];
        this.worldSize = 50;
        this.blockSize = 1;
        this.currentBlock = 'grass';
        this.currentTool = 'hand';
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.keys = {};
        this.mousePressed = false;
        this.musicEnabled = true;
        
        // Personaje y herramientas
        this.playerArm = null;
        this.toolMesh = null;
        this.isSwinging = false;
        this.swingAnimation = 0;
        this.targetBlock = null;
        this.miningProgress = 0;
        this.miningParticles = [];
        
        // Estadísticas del jugador
        this.playerStats = {
            coins: 50,
            food: 100,
            health: 100,
            wood: 0,
            stone: 0,
            level: 1,
            houses: 0,
            clothes: 'Básica',
            achievements: 0
        };
        
        // Inventario de herramientas
        this.inventory = {
            hand: true,
            axe: false,
            sword: false,
            pickaxe: false
        };
        
        // Colores de bloques
        this.blockColors = {
            grass: 0x4CAF50,
            dirt: 0x8B4513,
            stone: 0x808080,
            sand: 0xF4A460,
            wood: 0x8B4513,
            leaves: 0x228B22
        };
        
        // Dureza de bloques (tiempo para romper)
        this.blockHardness = {
            grass: 0.5,
            dirt: 0.8,
            stone: 2.0,
            sand: 0.3,
            wood: 1.5,
            leaves: 0.2
        };
        
        // Velocidad de movimiento
        this.moveSpeed = 0.2;
        this.jumpSpeed = 0.3;
        this.gravity = 0.01;
        this.velocityY = 0;
        this.onGround = false;
        
        this.init();
    }
    
    init() {
        this.showLoading();
        
        // Crear escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Crear cámara
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 10);
        
        // Crear renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('game').appendChild(this.renderer.domElement);
        
        // Iluminación
        this.setupLighting();
        
        // Crear personaje
        this.createPlayer();
        
        // Generar mundo
        this.generateWorld();
        
        // Configurar controles
        this.setupControls();
        
        // Configurar interfaz
        this.setupUI();
        
        // Iniciar loop de renderizado
        this.animate();
        
        // Ocultar loading después de 3 segundos
        setTimeout(() => {
            this.hideLoading();
        }, 3000);
    }
    
    createPlayer() {
        // Grupo del jugador
        this.playerGroup = new THREE.Group();
        this.camera.add(this.playerGroup);
        this.scene.add(this.camera);
        
        // Crear brazo del jugador
        const armGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB3 });
        this.playerArm = new THREE.Mesh(armGeometry, armMaterial);
        this.playerArm.position.set(0.5, -0.5, -1);
        this.playerGroup.add(this.playerArm);
        
        // Crear herramienta inicial
        this.createTool('hand');
    }
    
    createTool(toolType) {
        // Remover herramienta anterior
        if (this.toolMesh) {
            this.playerArm.remove(this.toolMesh);
        }
        
        let geometry, material;
        
        switch(toolType) {
            case 'hand':
                // Mano - sin herramienta visible
                this.toolMesh = null;
                return;
                
            case 'axe':
                // Hacha
                geometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                this.toolMesh = new THREE.Mesh(geometry, material);
                
                // Hoja del hacha
                const bladeGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.05);
                const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                blade.position.set(0, 0.2, 0);
                this.toolMesh.add(blade);
                break;
                
            case 'sword':
                // Espada
                geometry = new THREE.BoxGeometry(0.05, 0.8, 0.05);
                material = new THREE.MeshLambertMaterial({ color: 0xC0C0C0 });
                this.toolMesh = new THREE.Mesh(geometry, material);
                
                // Empuñadura
                const handleGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.1);
                const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                const handle = new THREE.Mesh(handleGeometry, handleMaterial);
                handle.position.set(0, -0.3, 0);
                this.toolMesh.add(handle);
                break;
                
            case 'pickaxe':
                // Pico
                geometry = new THREE.BoxGeometry(0.1, 0.6, 0.1);
                material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
                this.toolMesh = new THREE.Mesh(geometry, material);
                
                // Punta del pico
                const pickGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.05);
                const pickMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
                const pick = new THREE.Mesh(pickGeometry, pickMaterial);
                pick.position.set(0, 0.2, 0);
                this.toolMesh.add(pick);
                break;
        }
        
        if (this.toolMesh) {
            this.toolMesh.position.set(0, -0.3, 0);
            this.toolMesh.rotation.set(0, 0, Math.PI / 4);
            this.playerArm.add(this.toolMesh);
        }
    }
    
    startSwingAnimation() {
        if (!this.isSwinging) {
            this.isSwinging = true;
            this.swingAnimation = 0;
        }
    }
    
    updateSwingAnimation() {
        if (this.isSwinging) {
            this.swingAnimation += 0.3;
            
            // Animación de balanceo del brazo
            const swingAngle = Math.sin(this.swingAnimation) * 0.8;
            this.playerArm.rotation.x = swingAngle;
            
            if (this.toolMesh) {
                this.toolMesh.rotation.z = Math.PI / 4 + swingAngle * 0.5;
            }
            
            // Terminar animación
            if (this.swingAnimation >= Math.PI) {
                this.isSwinging = false;
                this.playerArm.rotation.x = 0;
                if (this.toolMesh) {
                    this.toolMesh.rotation.z = Math.PI / 4;
                }
            }
        }
    }
    
    createMiningParticles(block) {
        const particleCount = 10;
        const blockColor = this.blockColors[block.userData.type];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const particleMaterial = new THREE.MeshLambertMaterial({ color: blockColor });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Posición inicial en el bloque
            particle.position.copy(block.position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));
            
            // Velocidad aleatoria
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.2
            );
            
            particle.life = 1.0;
            this.scene.add(particle);
            this.miningParticles.push(particle);
        }
    }
    
    updateMiningParticles() {
        for (let i = this.miningParticles.length - 1; i >= 0; i--) {
            const particle = this.miningParticles[i];
            
            // Actualizar posición
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.02; // Gravedad
            
            // Actualizar vida
            particle.life -= 0.02;
            particle.material.opacity = particle.life;
            
            // Remover partícula si terminó su vida
            if (particle.life <= 0) {
                this.scene.remove(particle);
                this.miningParticles.splice(i, 1);
            }
        }
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
    
    setupLighting() {
        // Luz ambiente
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Luz direccional (sol)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }
    
    generateWorld() {
        // Generar terreno básico
        for (let x = -this.worldSize; x < this.worldSize; x++) {
            for (let z = -this.worldSize; z < this.worldSize; z++) {
                const height = Math.floor(Math.random() * 3) + 1;
                for (let y = 0; y < height; y++) {
                    let blockType = 'dirt';
                    if (y === height - 1) blockType = 'grass';
                    if (y === 0) blockType = 'stone';
                    
                    this.createBlock(x, y, z, blockType);
                }
                
                // Generar algunos árboles aleatoriamente
                if (Math.random() < 0.03) {
                    this.generateTree(x, height, z);
                }
            }
        }
        
        // Generar algunos recursos
        this.generateResources();
    }
    
    generateTree(x, y, z) {
        // Tronco
        const trunkHeight = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < trunkHeight; i++) {
            this.createBlock(x, y + i, z, 'wood');
        }
        
        // Hojas en forma de corona
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy < 3; dy++) {
                    if (dx === 0 && dz === 0 && dy < 2) continue; // No hojas en el centro
                    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue; // No hojas en esquinas
                    
                    if (Math.random() < 0.8) { // 80% de probabilidad de hoja
                        this.createBlock(x + dx, y + trunkHeight + dy, z + dz, 'leaves');
                    }
                }
            }
        }
    }
    
    generateResources() {
        // Generar piedras y madera esparcidas
        for (let i = 0; i < 30; i++) {
            const x = Math.floor(Math.random() * this.worldSize * 2) - this.worldSize;
            const z = Math.floor(Math.random() * this.worldSize * 2) - this.worldSize;
            const y = this.getGroundHeight(x, z) + 1;
            
            if (Math.random() < 0.4) {
                this.createBlock(x, y, z, 'stone');
            } else if (Math.random() < 0.3) {
                this.createBlock(x, y, z, 'wood');
            }
        }
    }
    
    getGroundHeight(x, z) {
        let height = 0;
        for (let y = 0; y < 10; y++) {
            if (this.getBlock(x, y, z)) {
                height = y;
            }
        }
        return height;
    }
    
    createBlock(x, y, z, type) {
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const material = new THREE.MeshLambertMaterial({ color: this.blockColors[type] });
        const block = new THREE.Mesh(geometry, material);
        
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData = { type: type, x: x, y: y, z: z, maxHealth: this.blockHardness[type], health: this.blockHardness[type] };
        
        this.scene.add(block);
        
        // Guardar en array del mundo
        if (!this.world[x]) this.world[x] = [];
        if (!this.world[x][y]) this.world[x][y] = [];
        this.world[x][y][z] = block;
    }
    
    removeBlock(x, y, z) {
        if (this.world[x] && this.world[x][y] && this.world[x][y][z]) {
            const block = this.world[x][y][z];
            this.scene.remove(block);
            this.world[x][y][z] = null;
            
            // Agregar recursos al inventario
            if (block.userData.type === 'wood') {
                this.playerStats.wood++;
                this.playerStats.coins += 2;
            } else if (block.userData.type === 'stone') {
                this.playerStats.stone++;
                this.playerStats.coins += 3;
            } else if (block.userData.type === 'leaves') {
                this.playerStats.coins += 1;
            }
            
            // Crear partículas de destrucción
            this.createMiningParticles(block);
            
            this.updateUI();
            this.playSound('break');
        }
    }
    
    getBlock(x, y, z) {
        return this.world[x] && this.world[x][y] && this.world[x][y][z];
    }
    
    setupControls() {
        // Controles de teclado
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyT') {
                this.openShop();
            } else if (e.code === 'KeyH') {
                this.buildHouse();
            } else if (e.code === 'KeyM') {
                this.toggleMusic();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Controles de ratón
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.mousePressed = true;
            this.handleMouseClick(e);
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            this.mousePressed = false;
            this.targetBlock = null;
            this.miningProgress = 0;
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
        
        // Bloquear pointer lock
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
        
        // Redimensionar ventana
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    handleMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const block = intersect.object;
            
            if (event.button === 0) { // Click izquierdo - usar herramienta
                if (block.userData && block.userData.type) {
                    this.targetBlock = block;
                    this.miningProgress = 0;
                    this.startSwingAnimation();
                }
            } else if (event.button === 2) { // Click derecho - colocar bloque
                this.placeBlock(intersect);
            }
        }
    }
    
    updateMining() {
        if (this.mousePressed && this.targetBlock) {
            // Calcular eficiencia de la herramienta
            let efficiency = 1;
            const blockType = this.targetBlock.userData.type;
            
            if (blockType === 'wood' && this.currentTool === 'axe') efficiency = 3;
            else if (blockType === 'stone' && this.currentTool === 'pickaxe') efficiency = 3;
            else if (blockType === 'leaves' && this.currentTool === 'sword') efficiency = 2;
            else if (this.currentTool === 'hand') efficiency = 0.5;
            
            this.miningProgress += efficiency * 0.02;
            
            // Crear partículas de minado
            if (Math.random() < 0.3) {
                this.createMiningParticles(this.targetBlock);
            }
            
            // Efecto visual del bloque dañado
            const damage = this.miningProgress / this.targetBlock.userData.maxHealth;
            this.targetBlock.material.opacity = 1 - damage * 0.3;
            
            // Romper bloque cuando se completa el minado
            if (this.miningProgress >= this.targetBlock.userData.maxHealth) {
                const { x, y, z } = this.targetBlock.userData;
                this.removeBlock(x, y, z);
                this.targetBlock = null;
                this.miningProgress = 0;
            }
            
            // Animar herramienta
            this.startSwingAnimation();
        }
    }
    
    placeBlock(intersect) {
        const face = intersect.face;
        const block = intersect.object;
        
        if (face && block.userData) {
            const { x, y, z } = block.userData;
            let newX = x, newY = y, newZ = z;
            
            // Determinar la posición según la cara
            if (face.normal.x > 0) newX += 1;
            else if (face.normal.x < 0) newX -= 1;
            else if (face.normal.y > 0) newY += 1;
            else if (face.normal.y < 0) newY -= 1;
            else if (face.normal.z > 0) newZ += 1;
            else if (face.normal.z < 0) newZ -= 1;
            
            // Verificar que no hay bloque ya
            if (!this.getBlock(newX, newY, newZ)) {
                this.createBlock(newX, newY, newZ, this.currentBlock);
                this.playSound('place');
            }
        }
    }
    
    updateMovement() {
        const direction = new THREE.Vector3();
        
        if (this.keys['KeyW']) direction.z -= this.moveSpeed;
        if (this.keys['KeyS']) direction.z += this.moveSpeed;
        if (this.keys['KeyA']) direction.x -= this.moveSpeed;
        if (this.keys['KeyD']) direction.x += this.moveSpeed;
        
        // Saltar
        if (this.keys['Space'] && this.onGround) {
            this.velocityY = this.jumpSpeed;
            this.onGround = false;
        }
        
        // Agacharse
        if (this.keys['ShiftLeft']) {
            direction.y -= this.moveSpeed;
        }
        
        // Aplicar movimiento
        this.camera.position.add(direction);
        
        // Aplicar gravedad
        this.velocityY -= this.gravity;
        this.camera.position.y += this.velocityY;
        
        // Verificar colisión con el suelo
        if (this.camera.position.y <= 5) {
            this.camera.position.y = 5;
            this.velocityY = 0;
            this.onGround = true;
        }
        
        // Consumir comida gradualmente
        if (Math.random() < 0.001) {
            this.playerStats.food = Math.max(0, this.playerStats.food - 1);
            if (this.playerStats.food === 0) {
                this.playerStats.health = Math.max(0, this.playerStats.health - 1);
            }
            this.updateUI();
        }
    }
    
    setupUI() {
        // Selector de bloques
        document.querySelectorAll('.block-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.block-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                this.currentBlock = e.target.dataset.block;
            });
        });
        
        // Selector de herramientas
        document.querySelectorAll('.tool-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const tool = e.target.dataset.tool;
                if (this.inventory[tool]) {
                    document.querySelectorAll('.tool-option').forEach(opt => opt.classList.remove('selected'));
                    e.target.classList.add('selected');
                    this.currentTool = tool;
                    this.createTool(tool);
                } else {
                    this.showMessage('¡Necesitas comprar esta herramienta primero!');
                }
            });
        });
        
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('coins').textContent = this.playerStats.coins;
        document.getElementById('food').textContent = this.playerStats.food;
        document.getElementById('health').textContent = this.playerStats.health;
        document.getElementById('wood').textContent = this.playerStats.wood;
        document.getElementById('stone').textContent = this.playerStats.stone;
        document.getElementById('level').textContent = this.playerStats.level;
        document.getElementById('houses').textContent = this.playerStats.houses;
        document.getElementById('clothes').textContent = this.playerStats.clothes;
        document.getElementById('achievements').textContent = this.playerStats.achievements;
        
        // Actualizar herramientas disponibles
        document.querySelectorAll('.tool-option').forEach(option => {
            const tool = option.dataset.tool;
            if (this.inventory[tool]) {
                option.classList.remove('disabled');
            } else {
                option.classList.add('disabled');
            }
        });
    }
    
    openShop() {
        document.getElementById('shop').style.display = 'block';
    }
    
    closeShop() {
        document.getElementById('shop').style.display = 'none';
    }
    
    buyItem(item, cost) {
        if (this.playerStats.coins >= cost) {
            this.playerStats.coins -= cost;
            
            switch(item) {
                case 'axe':
                    this.inventory.axe = true;
                    this.showMessage('¡Hacha comprada! 🪓');
                    break;
                case 'sword':
                    this.inventory.sword = true;
                    this.showMessage('¡Espada comprada! ⚔️');
                    break;
                case 'pickaxe':
                    this.inventory.pickaxe = true;
                    this.showMessage('¡Pico comprado! ⛏️');
                    break;
                case 'food':
                    this.playerStats.food = Math.min(100, this.playerStats.food + 50);
                    this.showMessage('¡Comida comprada! 🍖');
                    break;
                case 'clothes':
                    this.playerStats.clothes = 'Aventurero';
                    this.showMessage('¡Ropa nueva! 👕');
                    break;
                case 'house':
                    this.playerStats.houses++;
                    this.showMessage('¡Casa comprada! 🏠');
                    break;
            }
            
            this.updateUI();
        } else {
            this.showMessage('¡No tienes suficientes monedas! 💰');
        }
    }
    
    buildHouse() {
        if (this.playerStats.houses > 0) {
            const x = Math.floor(this.camera.position.x);
            const z = Math.floor(this.camera.position.z);
            const y = this.getGroundHeight(x, z) + 1;
            
            // Construir casa simple
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    for (let dy = 0; dy < 3; dy++) {
                        if (dx === -2 || dx === 2 || dz === -2 || dz === 2 || dy === 0) {
                            this.createBlock(x + dx, y + dy, z + dz, 'wood');
                        }
                    }
                }
            }
            
            this.playerStats.houses--;
            this.playerStats.achievements++;
            this.showMessage('¡Casa construida! 🏠');
            this.updateUI();
        } else {
            this.showMessage('¡Necesitas comprar un kit de casa primero!');
        }
    }
    
    toggleMusic() {
        const audio = document.getElementById('musicAudio');
        if (this.musicEnabled) {
            audio.pause();
            this.showMessage('🎵 Música desactivada');
        } else {
            audio.play();
            this.showMessage('🎵 Música activada');
        }
        this.musicEnabled = !this.musicEnabled;
    }
    
    playSound(type) {
        try {
            const audio = document.getElementById(type + 'Audio');
            if (audio) {
                audio.currentTime = 0;
                audio.play();
            }
        } catch (e) {
            console.log('No se pudo reproducir el sonido:', type);
        }
    }
    
    showMessage(text) {
        const message = document.getElementById('message');
        message.textContent = text;
        message.style.display = 'block';
        
        setTimeout(() => {
            message.style.display = 'none';
        }, 3000);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.updateMovement();
        this.updateMining();
        this.updateSwingAnimation();
        this.updateMiningParticles();
        this.renderer.render(this.scene, this.camera);
    }
}

// Inicializar el juego cuando se carga la página
window.addEventListener('load', () => {
    window.game = new MinecraftGame();
});

// Prevenir menú contextual
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});