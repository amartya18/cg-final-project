import { ActionManager, ArcFollowCamera, ArcRotateCamera, ExecuteCodeAction, Quaternion, Ray, TransformNode, Vector3 } from "@babylonjs/core";

export class Player extends TransformNode {

    constructor(assets, scene, shadowGenerator, input, canvas) {
        super('player', scene);
        this.PLAYER_SPEED = 0.45;
        this.PLAYER_GRAVITY = -2.8;
        this.PLAYER_JUMP_FORCE = 0.8;
        this.DASH_FACTOR = 2.5;
        this.DASH_TIME = 10;

        this.HEALTH = 100;
        this.attacking = false;

        this._gravity = new Vector3(0, 0, 0);
        this._jumpCount = 1;
        this.winGame = false;
        this.loseGame = false;

        this.dashTime = 0;
        this._dashPressed = false;
        this._canDash = true;

        this.scene = scene;
        this._setupPlayerCamera(canvas);

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        // animation group!
        this._attack = assets.animationGroups[0];
        this._death = assets.animationGroups[1];
        this._idle = assets.animationGroups[2];
        this._pickup = assets.animationGroups[3];
        this._punch = assets.animationGroups[4];
        this._receiveHit = assets.animationGroups[5];
        this._receiveHitAttacking = assets.animationGroups[6];
        this._run = assets.animationGroups[7];
        this._walk = assets.animationGroups[8];

        this._setupPlayerAnimation();

        this.scene.getLightByName('sparklight').parent = this.scene.getTransformNodeByName('Empty');

        shadowGenerator.addShadowCaster(this.mesh); // player will cast shadow

        this._input = input; // will get this from playerInput.js

        this.mesh.actionManager = new ActionManager(scene);
        this.sparkLit = true;
        this.lampsOn = 1;

        this.npcDefeated = 0;

        this._lastGroundPos = Vector3.Zero();

        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                {
                    trigger: ActionManager.OnIntersectionEnterTrigger,
                    parameter: this.scene.getMeshByName('destination')
                },
                () => {
                    console.log(this.lampsOn, this.npcDefeated)
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
                    parameter: this.scene.getMeshByName('ground')
                },
                () => {
                    this.mesh.position.copyFrom(this._lastGroundPos);
                }
            )
        )
    }

    get currentHealth() {
        return this.HEALTH;
    }

    _updateFromControls() {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        this._direction = Vector3.Zero();
        this._x = this._input.horizontal;
        this._z = this._input.vertical;

        if (this._input.dash && !this._dashPressed && this._canDash && !this._grounded) {
            this._canDash = false; // currently dashing, no more dashing
            this._dashPressed = true; // start the dash sequence

            // dash animation here
        }

        let dashFactor = 1;
        if (this._dashPressed) {
            if (this.dashTime > this.DASH_TIME) {
                this.dashTime = 0;
                this._dashPressed = false;
            } else {
                dashFactor = this.DASH_FACTOR;
            }
            this.dashTime++;
        }

        let forward = this._cameraRoot.forward;
        let right = this._cameraRoot.right;

        // make movement relative to camera position
        let cameraAngle = this.camera.getFrontPosition(5);
        this._cameraRoot.lookAt(cameraAngle);

        // COPY FROM HERE

        let scaledVertical = forward.scaleInPlace(this._z);
        let scaledHorizontal = right.scaleInPlace(this._x);

        let move = scaledHorizontal.addInPlace(scaledVertical);

        this._direction = new Vector3(move.normalize().x * dashFactor, 0, move.normalize().z * dashFactor);

        // not sure something to do with rotation camera (?)
        let magnitude = Math.abs(this._x) + Math.abs(this._z);
        if (magnitude < 0) {
            this._inputAmt = 0;
        } else if (magnitude > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = magnitude;
        }

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

        if (pick.hit) {
            return pick.pickedPoint;
        } else {
            return Vector3.Zero();
        }
    }

    // is player on ground
    _isGrounded() {
        if (this._groundRaycast(0, 0, 0.6).equals(Vector3.Zero())) {
            return false;
        } else {
            return true;
        }
    }

    _checkStairs() {
        let predict = function (mesh) {
            // if mesh pickable by raycast
            return mesh.isPickable && mesh.isEnabled();
        }

        // raycast around the player
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

        if (this._gravity.y < 0 && this._jumped) {
            // player currently falling
            this._falling = true;
        }

        // limit gravity to prevent player from flying
        if (this._gravity.y < -this.PLAYER_JUMP_FORCE) {
            this._gravity.y = -this.PLAYER_JUMP_FORCE;
        }

        // apply gravity
        this.mesh.moveWithCollisions(this._direction.addInPlace(this._gravity));

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

        if (this._input.jump && this._jumpCount > 0) {
            this._gravity.y = this.PLAYER_JUMP_FORCE;
            this._jumpCount--;

            this._jumped = true;
            this._falling = false;
        }
    }

    // TODO fix camera position, follow back of mesh https://playground.babylonjs.com/#0ZP9MH#4
    _setupPlayerCamera(canvas) {
        // similar to empty mesh
        this._cameraRoot = new TransformNode('cameraRoot');
        // starting point
        this._cameraRoot.position = new Vector3(0, 0, 0);
        // to match player rotation
        this._cameraRoot.rotation = new Vector3(0, Math.PI, 0);

        // YTILT NEEDED HERE?

        // actual camera
        // this.camera = new UniversalCamera('real', new Vector3(0, 10, -30), this.scene);
        this.camera = new ArcRotateCamera('real', 0, 0, 19, new Vector3(0, 3, 0), this.scene);
        this.camera.fov = 0.7;
        // find a way to rotate behind character

        this.camera.inputs.clear();
        this.camera.inputs.addPointers();
        this.camera.attachControl(canvas, true);

        // use lockedTarget instead of parents to prevent rotation whtn TransformNode rotate
        // this.camera.parent = this._cameraRoot;
        this.camera.lockedTarget = this._cameraRoot;

        this.scene.activeCamera = this.camera;
        return this.camera;
    }

    _updateCamera() {
        // depends on origin of mesh middle/bottom
        let centerPlayer = this.mesh.position.y + 2;
        this._cameraRoot.position = Vector3.Lerp( // lerp smooth camera transition
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

        this._attack.loopAnimation = true;

        // setup current and previous animation
        this._currentAnimation = this._idle;
        this._previousAnimation = this._run;

        // listener, when player attack reduce npc health
        this._attack.onAnimationGroupPlayObservable.add(() => {
            // console.log('aaa');
            this.attacking = !this.attacking;
        });
        // wait for death animation to play out before moving to lose game state
        this._death.onAnimationGroupEndObservable.add(() => {
            this.dispose();
            this.loseGame = true;
        });
    }

    _playerAnimation() {
        if (this._grounded && !this._falling && this._input.attack && (this._input.inputMap['e'])) {
            // attack
            this._currentAnimation = this._attack;
        } else if (!this._dashPressed && !this._falling && !this._jumped && (this._input.inputMap['w'] || this._input.inputMap['a'] || this._input.inputMap['s'] || this._input.inputMap['d'])) {
            this._currentAnimation = this._run;
        } else if (this._jumped && !this._falling && !this._dashPressed) {
            // jump animation
            this._currentAnimation = this._punch
        } else if (this._falling) {
            // land animation
        } else if (this._grounded && !this._falling) {
            this._currentAnimation = this._idle;
        } 

        // play current animation
        if (this._previousAnimation !== this._currentAnimation && this._currentAnimation != null) {
            this._previousAnimation.stop();
            this._currentAnimation.play(this.currentHealth.loopAnimation);
            this._previousAnimation = this._currentAnimation;
        }
    }

    _deadOrAlive() {
        if (this.HEALTH === 0) {
            // dead animation and dispose
            this.currentAnimation = null;
            this._death.play(false);
            this.HEALTH = -1;
        }
    }

    _beforeRenderUpdate() {
        this._updateFromControls();
        // move mesh
        this._updateGroundDetection();
        // this.mesh.moveWithCollisions(this._direction);
        this._playerAnimation();
        this._deadOrAlive();
    }

    _activePlayerCamera() {
        this.scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
            this._updateCamera();
        });
    }
}