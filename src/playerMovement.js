import { ActionManager, ExecuteCodeAction, Scalar, Vector3 } from "@babylonjs/core";


export class PlayerMovement {
    constructor(scene) {
        scene.actionManager = new ActionManager(scene);

        this.inputMap = {};
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (e) => {
                // this.inputMap[e.sourceEvent.key] = e.sourceEvent.type == 'keydown';
                if (e.sourceEvent.type == 'keydown') {
                    this.inputMap[e.sourceEvent.key] = true;
                }
            })
        );
        scene.actionManager.registerAction(
            new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (e) => {
                this.inputMap[e.sourceEvent.key] = e.sourceEvent.type == 'keydown';
            })
        );

        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });
    }

    _updateFromKeyboard() {
        // attack
        if (this.inputMap['e']) {
            this.attack = true;
        } else {
            this.attack = false;
        }
        if (this.inputMap['w'] && !this.attack) {
            this.vertical = Scalar.Lerp(this.vertical, -1, .2);
            this.verticalAxis = -1;
        } else if (this.inputMap['s'] && !this.attack) {
            this.vertical = Scalar.Lerp(this.vertical, 1, .2);
            this.verticalAxis = 1;
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        if (this.inputMap['a'] && !this.attack) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, .2);
            this.horizontalAxis = 1;
        } else if (this.inputMap['d'] && !this.attack) {
            this.horizontal = Scalar.Lerp(this.horizontal, -1, .2);
            this.horizontalAxis = -1;
        } else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }
        if (this.inputMap['Shift']) {
            this.dash = true;
        } else {
            this.dash = false;
        }
        // jump
        if (this.inputMap[' ']) {
            this.jump = true; 
        } else {
            this.jump = false;
        }
    }
}