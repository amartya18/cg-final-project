import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

// DIRECT IMPORTS
import {
    Engine, 
    Scene, 
    Vector3, 
    HemisphericLight, 
    PointLight,
    MeshBuilder, 
    Color3, 
    FreeCamera,
    Matrix,
    ShadowGenerator,
    Quaternion,
    SceneLoader,
} from "@babylonjs/core";

import {
    AdvancedDynamicTexture,
    Button,
    Control,
    Rectangle,
    TextBlock,
    Image
} from '@babylonjs/gui'

// Classes Imports
import { Level } from "./level";
import { Player } from "./playerController";
import { PlayerMovement } from "./playerMovement";
import { Npc } from "./npcController";
import { GameHud } from "./gameHud";

// game states
const State = {
    START: 0,
    GAME: 1,
    LOSE: 2,
    LOADING: 3,
    INSTRUCTIONS: 4,
}

class App {
    constructor() {
        this._canvas = this._createCanvas();

        // engine and scene
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine, true);

        // current state
        this._state = 0;

        // enable babylon debugger
        window.addEventListener('keydown', (ev) => {
            // shift option i => babylon debugger
            if (ev.shiftKey && ev.ctrlKey && ev.keyCode === 73) {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        // run the program when class is instantiated
        this._main();
    }

    _createCanvas() {
        // enable fullscreen
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        // create html canvas element
        this._canvas = document.createElement('canvas');
        this._canvas.style.width = '100%';
        this._canvas.style.height = '100%';
        this._canvas.id = 'mainCanvas';
        document.body.appendChild(this._canvas);

        return this._canvas;
    }

    // main loop of the program based on the game state
    async _main() {
        await this._goToStart();

        // render loop to render the scene
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.LOADING:
                    this._scene.render();
                    break;
                case State.INSTRUCTIONS:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default: break;
            }
        });

        // make game responsive based on the user screen size
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    async _goToStart() {
        // display ui
        this._engine.displayLoadingUI();

        // create scene and and set fixed camera
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color3.FromHexString('#4079CA');
        let camera = new FreeCamera('camera1', new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero())

        // instantiate babylon UI feature
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI('UI');
        guiMenu.idealHeight = 720;

        // add container to the menu
        const container = new Rectangle('menuContainer');
        container.thickness = 0;
        container.width = 0.5;
        guiMenu.addControl(container);

        // add game logo to the menu
        const titleMenu = new Image('titleMenu', './assets/StartMenu.png');
        titleMenu.width= '60%';
        titleMenu.stretch = Image.STRETCH_UNIFORM;
        container.addControl(titleMenu);

        // add sub description text to the menu
        const subText = new TextBlock('subText');
        subText.text = '3D Platformer';
        subText.color = 'white';
        subText.top = '80px'
        subText.fontSize = '20px';
        container.addControl(subText);

        // add start button to move to the next game state
        const startBtn = Button.CreateSimpleButton('start', 'PLAY');
        startBtn.width = 0.4;
        startBtn.height = '40px';
        startBtn.color = 'white';
        startBtn.top = '150px';
        container.addControl(startBtn);


        // start button event handler changes the game state to the instruction state
        startBtn.onPointerDownObservable.add(() => {
            this._goToInstructions();
        })

        // wait for the scene to finish loading
        await scene.whenReadyAsync(); // 
        this._engine.hideLoadingUI();

        // dispose old state
        this._scene.dispose();
        this._scene = scene;

        this._state = State.START;
    }

    async _goToInstructions() {
        // setup instructions scene and camera
        this._engine.displayLoadingUI();
        this._scene.detachControl();
        this._instructions = new Scene(this._engine);
        let camera = new FreeCamera('camera1', new Vector3(0, 0, 0), this._instructions);
        camera.setTarget(Vector3.Zero());

        // set background screen color
        this._instructions.clearColor = new Color3.FromHexString('#4079CA');

        // instantiate babylon ui feature
        const instructionsUI = AdvancedDynamicTexture.CreateFullscreenUI('instructions');
        instructionsUI.idealHeight = 720;

        // insert container to the instruction ui
        const container = new Rectangle('instructionsContainer');
        container.thickness = 0;
        container.width = 0.5;
        instructionsUI.addControl(container);

        // add image describing the game controls and objective to the ui
        const instructionsPNG = new Image('titleMenu', './assets/instructions.png');
        instructionsPNG.width= '100%';
        instructionsPNG.stretch = Image.STRETCH_UNIFORM;
        container.addControl(instructionsPNG);

        // button to move to next game state
        const btn = Button.CreateSimpleButton("next", "NEXT");
        btn.color = "white";
        btn.thickness = 0;
        btn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        btn.width = "64px";
        btn.height = "64px";
        btn.top = "-3%";
        btn.left = "-12%";
        instructionsUI.addControl(btn);

        // wait scene to finish loading
        await this._instructions.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._state = State.INSTRUCTIONS;
        this._scene = this._instructions;

        // button event handler to move to next game state
        btn.onPointerUpObservable.add(() => {
            this._goToCutScene();
        })
    }

    async _goToCutScene() {
        // setup scene and camera
        this._engine.displayLoadingUI();
        this._scene.detachControl();
        this._cutScene = new Scene(this._engine);
        let camera = new FreeCamera('camera1', new Vector3(0, 0, 0), this._cutScene);
        camera.setTarget(Vector3.Zero());

        // setup background color
        this._cutScene.clearColor = new Color3.FromHexString('#4079CA');

        // instantiate babylon ui feature
        const cutScene = AdvancedDynamicTexture.CreateFullscreenUI('cutscene');

        // insert container to the loading screen
        const container = new Rectangle('menuContainer');
        container.thickness = 0; // remove white border
        container.width = 0.5;
        cutScene.addControl(container);

        // add loading text
        const loadingText = new TextBlock('loadingText');
        loadingText.text = 'Loading...'
        loadingText.fontSize = '50';
        loadingText.color = 'white';
        container.addControl(loadingText);

        // wait the scene to finish loading
        await this._cutScene.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._state = State.CUTSCENE;
        this._scene = this._cutScene;

        // setup the game assets and make sure it is ready beforing moving to the game state
        let finishedLoading = false;
        await this._setUpGame().then(res => {
            finishedLoading = true;
            this._goToGame();
        });
    }

    // function responsible to setup the game environment before moving to the next game state
    async _setUpGame() {
        let scene = new Scene(this._engine);
        this._gamescene = scene;

        // load assets
        const level = new Level(scene);
        this._level = level;
        await this._level.load();
        await this._loadPlayerAssets(scene);
        // load npc asset
        await this._loadNPCAssets(scene);
    }

    // loads player asset 
    async _loadPlayerAssets(scene) {
        async function loadPlayer() {
            // use box mesh as our mesh parent to detect collision in the future
            const outer = MeshBuilder.CreateBox('outer', { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            // rotate to the back of the player
            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0)

            // import the player mesh from GLB file, set isPickable, and parent
            return SceneLoader.ImportMeshAsync(null, './models/', 'RogueFix.glb', scene).then((res) => {
                const root = res.meshes[0];
                const body = root;
                body.parent = outer;
                body.isPickable = false;
                body.getChildMeshes().forEach(element => {
                    element.isPickable = false;
                });

                // return the outer mesh and the player animation
                return {
                    mesh: outer,
                    animationGroups: res.animationGroups
                }
            });

        }

        // make sure the player asset are loaded before setting this.assets
        return loadPlayer().then((assets) => {
            this.assets = assets;
        })
    }

    // load snake NPC
    async _loadNPCAssets(scene) {
        // all NPCs name
        let npcsName = ['snake1', 'snake2', 'snake3'];

        // the positions of the NPCs
        let npcsPos = [
            new Vector3(-55, 13, 132),
            new Vector3(-0.12, 30, 19.83),
            new Vector3(20, 17, 41),
        ];

        // load NPC mesh from GLB file and pass npc mesh to its class
        let npc = null;
        for (let i = 0; i < npcsName.length; i++) {
            const element = npcsName[i];

            // use box as outer mesh to detect collision
            const outer = MeshBuilder.CreateBox(`${element}Outer`, { width: 2, height: 3, depth: 3 }, scene);
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1, 0));
            outer.position = npcsPos[i];
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            // import NPC asset/mesh from GLB file
            SceneLoader.ImportMeshAsync(null, './models/', `snake.glb`, scene).then((res) => {
                // set loaded mesh as children of outer
                res.meshes[0].parent = outer;
                npc = new Npc(element, outer, scene, this._player, this._engine, res.animationGroups); // instantiate NPC object/class
                // activate NPC
                npc._activeNPC();
            });

            // set npc position based on previous array
            outer.position = npcsPos[i];
        }
    }

    async _initGameAsync(scene) {
        // main gamme lighting
        var light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);
        const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
        light.diffuse = new Color3(0.08, 0.109, 0.1529);
        light.intensity = 35;
        light.radius = 1;

        // shadow generator
        const shadowGenerator = new ShadowGenerator(1024, light);
        shadowGenerator.darkness = 0.4;

        // instantiate / pass player mesh to player class with relevant parameters
        this._player = new Player(this.assets, scene, shadowGenerator, this._input, this._canvas);
        const camera = this._player._activePlayerCamera(); // setup and grab player camera

        // check for player and lamp collision by passing player to lamp
        this._level.checkLamp(this._player);

        scene.onBeforeRenderObservable.add(() => {
            // if a lamp is turned on
            if (this._player.sparkLit) {
                // update UI / game hud
                this._gameUi._updateLamp(this._player.lampsOn);
                this._player.sparkLit = false;
            }

            // update health bar and npc defeated counter
            this._gameUi._updateNpcDefeated(this._player.npcDefeated);
            this._gameUi._updatePlayerHealth(this._player.HEALTH);


            // if player win go to win state
            if (this._player.winGame) {
                this._goToWin();
            }

            // if player lose go to win state
            if (this._player.loseGame) {
                this._goToLose();
            }
        });
    }

    async _goToGame() {
        // detach controls to prevent user input
        this._scene.detachControl();
        let scene = this._gamescene;

        // instantiate game hud
        const gameUi = new GameHud();
        this._gameUi = gameUi;

        // instantiate player movement
        this._input = new PlayerMovement(scene);

        // initialize game loop
        await this._initGameAsync(scene);

        // wait for scene finish loading
        await scene.whenReadyAsync();

        // move player to start position
        scene.getMeshByName('outer').position = scene.getTransformNodeByName('startPosition').getAbsolutePosition();

        //get rid of loading scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = scene;

        this._engine.hideLoadingUI();
    }

    async _goToLose() {
        // setup scene and camera
        this._engine.displayLoadingUI();
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        // setup color background
        scene.clearColor = new Color3.FromHexString('#4079CA');

        // use babylon ui feature
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // create lose button so the player knows they lost and can play the game again by pressing the button
        const mainBtn = Button.CreateSimpleButton("mainmenu", "YOU LOSE");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        guiMenu.addControl(mainBtn);

        // button event handler to start the game again
        mainBtn.onPointerUpObservable.add(() => {
            this._goToStart();
        });

        // wait for scene to load
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //when the scene is ready, hide loading

        // set current state to lose and dispose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }

    async _goToWin() {
        // scene and camera setup
        this._engine.displayLoadingUI();
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color3.FromHexString('#4079CA');
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        // babylon ui feature
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // add win button so playe knows he/she wins and can play again if wanted
        const mainBtn = Button.CreateSimpleButton("winmenu", "You Win!");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        guiMenu.addControl(mainBtn);

        // win button event handler which changes the game state to start again if user decided to play again
        mainBtn.onPointerUpObservable.add(() => {
            this._goToStart();
        });

        // wait for scene loading
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); 

        // dispose old scene and change game state
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }
}


new App();