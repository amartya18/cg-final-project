import { PlaneRotationGizmo } from '@babylonjs/core';
import {
    AdvancedDynamicTexture,
    TextBlock,
    Control,
    Rectangle,
    PlanePanel
} from '@babylonjs/gui'


export class GameHud {
    constructor(scene) {
        // assign scene for future use
        this._scene = scene;

        // instantiate babylon ui featuer
        const gameUI = AdvancedDynamicTexture.CreateFullscreenUI('ui');
        this._gameUI = gameUI;
        this._gameUI.idealHeight = 720;

        // first npc and lamp counter when player just started the game
        this.npcDefeatedCount = 0;
        this.playerHealth = 100;

        // lamp counter game HUD setup
        const lampCount = new TextBlock();
        lampCount.name = 'lamp turned on';
        lampCount.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        lampCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        lampCount.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        lampCount.fontSize = "22px";
        lampCount.color = "white";
        lampCount.text = "🏮 Lamps: 1 / 22";
        lampCount.top = "32px";
        lampCount.left = "-64px";
        lampCount.width = "25%";
        lampCount.fontFamily = "Tomorrow";
        lampCount.resizeToFit = true;
        gameUI.addControl(lampCount);
        this._lampCount = lampCount;

        // npc counter game HUD setup
        const npcCount = new TextBlock();
        npcCount.name = 'enemy defeated';
        npcCount.textVerticalAlignment = TextBlock.VERTICAL_ALIGNMENT_CENTER;
        npcCount.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        npcCount.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        npcCount.fontSize = "22px";
        npcCount.color = "white";
        npcCount.text = "🐍 Enemy: 0 / 3";
        npcCount.top = "59px";
        npcCount.left = "-64px";
        npcCount.width = "25%";
        npcCount.fontFamily = "Tomorrow";
        npcCount.resizeToFit = true;
        gameUI.addControl(npcCount);
        this._npcCount = npcCount;

        // player health  game HUD setup
        const playerHealth = new TextBlock();
        playerHealth.width = "25%";
        playerHealth.text = '❤️ 100 / 100';
        playerHealth.color = 'red';
        playerHealth.fontSize = '25px';
        playerHealth.verticalAlignment = 0;
        playerHealth.horizontalAlignment = 0;
        playerHealth.left = "0";
        playerHealth.top = "0";
        gameUI.addControl(playerHealth);
        this._playerHealth = playerHealth;

        // assign babylon ui object
        this.gameUI = gameUI;
    }

    // update the lamp counter game HUD real time
    _updateLamp(lampsCount) {
        this._lampCount.text = '🏮 Lamp: ' + lampsCount + " / 22";
    }

    // update the npc counter game HUD real time
    _updateNpcDefeated(npcDefeatedCount) {
        // if the npc counter increases
        if (npcDefeatedCount > this.npcDefeatedCount) {
            this.npcDefeatedCount = npcDefeatedCount;
            this._npcCount.text = '🐍 Enemy defeated: ' + npcDefeatedCount + ' / 3';
        }
    }

    // update the player health real time
    _updatePlayerHealth(playerHealth) {
        this.playerHealth = playerHealth;
        // if the player health is 0
        if (playerHealth < 0) {
            this._playerHealth.text = '❤️ 0 / 100';
        } else {
            // if not change the text based on current health
            this._playerHealth.text = '❤️ ' + playerHealth + ' / 100';
        }
        if (playerHealth < 25) {
            // if player health below 25 change color to white
            this._playerHealth.color = 'white';
        } else if (playerHealth < 65) {
            // if player health below 65 change color to yellow
            this._playerHealth.color = 'yellow';
        }
    }
}