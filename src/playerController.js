import { ActionManager, ArcRotateCamera, ExecuteCodeAction, Quaternion, Ray, TransformNode, Vector3 } from "@babylonjs/core";

export class Player extends TransformNode {

    constructor(assets, scene, shadowGenerator, input, canvas) {
        super('player', scene);
        // player constant attributes
        this.PLAYER_SPEED = 0.45;
        this.PLAYER_GRAVITY = -2.8;
        this.PLAYER_JUMP_FORCE = 0.8;
        this.DASH_FACTOR = 2.5;
        this.DASH_TIME = 10;

        // player health and attacking state
        this.HEALTH = 100;
        this.attacking = false;

        // default gravity
        this._gravity = new Vector3(0, 0, 0);

        this._jumpCount = 1;

        // win and lose state
        this.winGame = false;
        this.loseGame = false;

        // dash attributes to track when to dash
        this.dashTime = 0;
        this._dashPressed = false;
        this._canDash = true;

        // assign scene and setup player camera
        this.scene = scene;
        this._setupPlayerCamera(canvas);

        // assign mesh parent object / class
        this.mesh = assets.mesh;
        this.mesh.parent = this;

        // all player animation
        this._attack = assets.animationGroups[0];
        this._death = assets.animationGroups[1];
        this._idle = assets.animationGroups[2];
        this._pickup = assets.animationGroups[3];
        this._jump = assets.animationGroups[4];
        this._receiveHit = assets.animationGroups[5];
        this._receiveHitAttacking = assets.animationGroups[6];
        this._run = assets.animationGroups[7];
        this._walk = assets.animationGroups[8];

        // setup player animation
        this._setupPlayerAnimation();

        this.scene.getLightByName('sparklight').parent = this.scene.getTransformNodeByName('Empty');

        shadowGenerator.addShadowCaster(this.mesh); // player will cast shadow

        // get inputs from playerMovement.js
        this._input = input; 

        // stup ActionManager
        this.mesh.actionManager = new ActionManager(scene);

        this.sparkLit = true;
        this.lampsOn = 1;

        this.npcDefeated = 0;
        this._lastGroundPos = Vector3.Zero();

        // action manager change win game state to win
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: this.scene.getMeshByName('destination')
                },
                () => {
                    // make sure all npc and lamps are on before the player are able to win
                    if (this.lampsOn >= 22 && this.npcDefeated >= 3) {
                        this.winGame = true;
                    }
                }
            )
        );

        // if player fall respawn in last position
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                },
                () => {
                    // the position where player respawn
                    this.mesh.position.copyFrom(this._lastGroundPos);
                }
            )
        )
    }

    // current health getter
    get currentHealth() {
        return this.HEALTH;
    }

    // playe movement
    _updateFromControls() {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        // get vertical and horizontal
        this._direction = Vector3.Zero();
        this._x = this._input.horizontal;
        this._z = this._input.vertical;

        // check if dash is allowed or not
        if (this._input.dash && !this._dashPressed && this._canDash && !this._grounded) {
            this._canDash = false; // currently dashing, no more dashing
            this._dashPressed = true; // start the dash sequence
        }

        let dashFactor = 1;
        if (this._dashPressed) {
            // track dash duration
            if (this.dashTime > this.DASH_TIME) {
                this.dashTime = 0;
                this._dashPressed = false;
            } else {
                // assign dash factor to dash
                dashFactor = this.DASH_FACTOR;
            }
            // track dash duration
            this.dashTime++;
        }

        // get right and forward vector relative to camera direction
        let forward = this._cameraRoot.forward;
        let right = this._cameraRoot.right;

        // make movement relative to camera direction
        let cameraAngle = this.camera.getFrontPosition(5);
        this._cameraRoot.lookAt(cameraAngle);

        // scale movement based on the forward and right vector
        let scaledVertical = forward.scaleInPlace(this._z);
        let scaledHorizontal = right.scaleInPlace(this._x);

        // combined the scaled vertical and horizontal
        let move = scaledHorizontal.addInPlace(scaledVertical);

        // move the player based on the move vector, normalized and applied with dashFactor if it exist
        this._direction = new Vector3(move.normalize().x * dashFactor, 0, move.normalize().z * dashFactor);

        // check magnitude
        let magnitude = Math.abs(this._x) + Math.abs(this._z);
        if (magnitude < 0) {
            this._inputAmt = 0;
        } else if (magnitude > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = magnitude;
        }

        // to get better and smoother player movement, and have the player move based on PLAYER_SPEED constant
        this._direction = this._direction.scaleInPlace(this._inputAmt * this.PLAYER_SPEED);

        // Rotations
        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis);
        // no input detected prevent rotation
        if (input.length() == 0) {
            return;
        }

        // rotation based on input axes and camera angle
        let angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);
        angle += this._cameraRoot.rotation.y;
        let target = Quaternion.FromEulerAngles(0, angle, 0);
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, target, 10 * this._deltaTime);
    }

    _groundRaycast(offsetx, offsetz, raycastlen) {
        // send single raycast down to detect ground
        let raycastGroundPosition = new Vector3(this.mesh.position.x + offsetx, this.mesh.position.y + 0.5, this.mesh.position.z + offsetz);
        let ray = new Ray(raycastGroundPosition, Vector3.Up().scale(-1), raycastlen);

        let predict = function (mesh) {
            return mesh.isPickable && mesh.isEnabled;
        };
        let pick = this.scene.pickWithRay(ray, predict);

        // if raycast hits
        if (pick.hit) {
            // return the picked point
            return pick.pickedPoint;
        } else {
            // else return vector3 of zero
            return Vector3.Zero();
        }
    }

    // check if player is grounded with the raycast function _groundRaycast()
    _isGrounded() {
        // simply return true if grounded and else if not
        // if equals to vector zero not on ground
        if (this._groundRaycast(0, 0, 0.6).equals(Vector3.Zero())) { 
            return false;
        } else {
            return true;
        }
    }

    // to check and move through stairs
    _checkStairs() {
        let predict = function (mesh) {
            // if mesh pickable by raycast
            return mesh.isPickable && mesh.isEnabled();
        }

        // raycast 4 direction around the player
        let raycastRadius1 = new Vector3(this.mesh.position.x, this.mesh.position.y + .5, this.mesh.position.z + .25);
        let raycast1 = new Ray(raycastRadius1, Vector3.Up().scale(-1), 1.5);
        let pick1 = this.scene.pickWithRay(raycast1, predict);

        let raycastRadius2 = new Vector3(this.mesh.position.x, this.mesh.position.y + .5, this.mesh.position.z - .25);
        let raycast2 = new Ray(raycastRadius2, Vector3.Up().scale(-1), 1.5);
        let pick2 = this.scene.pickWithRay(raycast2, predict);

        let raycastRadius3 = new Vector3(this.mesh.position.x + .25, this.mesh.position.y + .5, this.mesh.position.z);
        let raycast3 = new Ray(raycastRadius3, Vector3.Up().scale(-1), 1.5);
        let pick3 = this.scene.pickWithRay(raycast3, predict);

        let raycastRadius4 = new Vector3(this.mesh.position.x - .25, this.mesh.position.y + .5, this.mesh.position.z);
        let raycast4 = new Ray(raycastRadius4, Vector3.Up().scale(-1), 1.5);
        let pick4 = this.scene.pickWithRay(raycast4, predict);

        // if any of the 4 direction hit a mesh named stair return true
        if (pick1.hit && !pick1.getNormal().equals(Vector3.Up())) {
            if (pick1.pickedMesh.name.includes('stair')) {
                return true;
            }
        } else if (pick2.hit && !pick2.getNormal().equals(Vector3.Up())) {
            if (pick2.pickedMesh.name.includes('stair')) {
                return true;
            }
        } else if (pick3.hit && !pick3.getNormal().equals(Vector3.Up())) {
            if (pick3.pickedMesh.name.includes('stair')) {
                return true;
            }
        } else if (pick4.hit && !pick4.getNormal().equals(Vector3.Up())) {
            if (pick4.pickedMesh.name.includes('stair')) {
                return true;
            }
        }
        return false;
    }
    
    // apply gravity to keep player grounded
    _updateGroundDetection() {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        // if player not grounded
        if (!this._isGrounded()) {
            // is player on a stair/slope
            if (this._checkStairs() && this._gravity.y <= 0) {
                // player can jump and no gravity
                this._gravity.y = 0;
                this._jumpCount = 1;
                this._grounded = true;
            } else {
                // apply gravity
                this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * this.PLAYER_GRAVITY));
                this._grounded = false;
            }
        }

        // check if player is falling or not
        if (this._gravity.y < 0 && this._jumped) {
            this._falling = true;
        }

        // limit gravity to prevent player from flying and infinite falling
        if (this._gravity.y < -this.PLAYER_JUMP_FORCE) {
            this._gravity.y = -this.PLAYER_JUMP_FORCE;
        }

        // apply gravity
        this.mesh.moveWithCollisions(this._direction.addInPlace(this._gravity));

        // player jump code
        if (this._isGrounded()) {
            this._gravity.y = 0;
            this._grounded = true;
            this._lastGroundPos.copyFrom(this.mesh.position);
            // possible double jump implementation
            this._jumpCount = 1;

            // reset dash if player on ground
            this._canDash = true;
            this.dashTime = 0;
            this._dashPressed = false;

            // prevent jump while falling
            this._falling = false;
            this._jumped = false;
        }

        // if player allowed to jump
        if (this._input.jump && this._jumpCount > 0) {
            // apply jump force to y axis to negate gravity which makes the player jump
            this._gravity.y = this.PLAYER_JUMP_FORCE;
            this._jumpCount--;

            this._jumped = true;
            this._falling = false;
        }
    }

    _setupPlayerCamera(canvas) {
        // transform node as our root mesh that our camera follows
        this._cameraRoot = new TransformNode('cameraRoot');
        // set starting point
        this._cameraRoot.position = new Vector3(0, 0, 0);
        // to match player rotation
        this._cameraRoot.rotation = new Vector3(0, Math.PI, 0);

        // actual camera
        this.camera = new ArcRotateCamera('real', 0, 0, 19, new Vector3(0, 3, 0), this.scene);
        this.camera.fov = 0.7;

        // clear keyboard camera controls and only assign mouse camera controls
        this.camera.inputs.clear();
        this.camera.inputs.addPointers();

        // attach to canvas
        this.camera.attachControl(canvas, true);

        // use lockedTarget instead of parents to prevent rotation when TransformNode rotate
        this.camera.lockedTarget = this._cameraRoot;

        this.scene.activeCamera = this.camera;
        return this.camera;
    }

    _updateCamera() {
        let centerPlayer = this.mesh.position.y + 2;

        // update camera position based on player position
        this._cameraRoot.position = Vector3.Lerp( // lerp for smooth camera transition
            this._cameraRoot.position,
            new Vector3(
                this.mesh.position.x,
                centerPlayer,
                this.mesh.position.z
            ),
            0.4
        )
    }

    _setupPlayerAnimation() {
        // stop current animation
        this._scene.stopAllAnimations();

        // set attack animation loop
        this._attack.loopAnimation = false;

        // setup current and previous animation
        this._currentAnimation = this._idle;
        this._previousAnimation = this._run;

        // listener, when player attack reduce npc health
        this._attack.onAnimationGroupPlayObservable.add(() => {
            this.attacking = !this.attacking;
        });

        // wait for death animation to play out before moving to lose game state
        this._death.onAnimationGroupEndObservable.add(() => {
            this.dispose();
            this.loseGame = true;
        });
    }

    _playerAnimation() {
        // if player is attacking
        if (this._grounded && !this._falling && this._input.attack && (this._input.inputMap['e'])) {
            // play attack animation
            this._currentAnimation = this._attack;
        } else if (!this._dashPressed && !this._falling && !this._jumped && (this._input.inputMap['w'] || this._input.inputMap['a'] || this._input.inputMap['s'] || this._input.inputMap['d'])) {
            // if player if moving play run animation
            this._currentAnimation = this._run;
        } else if (this._jumped && !this._falling && !this._dashPressed) {
            // if player is jumping play jump animation
            this._currentAnimation = this._jump
        } else if (this._falling) {
            // falling animation here
        } else if (this._grounded && !this._falling) {
            // if not moving play idle animation
            this._currentAnimation = this._idle;
        } 

        // play current animation
        if (this._previousAnimation !== this._currentAnimation && this._currentAnimation != null) {
            this._previousAnimation.stop();
            this._currentAnimation.play(this.currentHealth.loopAnimation);
            this._previousAnimation = this._currentAnimation;
        }
    }

    // check player alive or not
    _deadOrAlive() {
        // if dead
        if (this.HEALTH === 0) {
            // dead animation and dispose
            this.currentAnimation = null;
            this._death.play(false);
            this.HEALTH = -1;
        }
    }

    _beforeRenderUpdate() {
        // call all player function
        this._updateFromControls();
        this._updateGroundDetection();
        this._playerAnimation();
        this._deadOrAlive();
    }

    _activePlayerCamera() {
        // scene render loop
        this.scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
            this._updateCamera();
        });
    }
}