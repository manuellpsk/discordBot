const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '.env')
});
const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const pool = require('./db');
let serverMusic = {};
//Set token bot
client.login(process.env.TOKEN_BOT);

//Config Bot
const channelName = 'test'; //Bot listen only this channel
const timeMusic = 10000;

//onReady
client.on('ready', () => {
    console.log(`Bot ${client.user.tag} is ready!`);
})

//onMessage
client.on('message', async message => {
    if (!message.guild) return;
    if (!serverMusic[message.guild.id]) {
        serverMusic[message.guild.id] = {
            dispatcher: null,
            isPlaying: false,
            channel: null
        }
    }
    if (message.channel.name === channelName && !message.author.bot) {//Validadon el channel de donde viene el mensaje
        const regex = new RegExp('#[a-z]{2,10}', 'i');//prefix bot
        if (regex.test(message.content)) {
            if (/\s/.test(message.content)) { // para comandos con parametros
                let array = message.content.split(' ');
                switch (array[0].substring(1).toLowerCase()) {
                    case 'set':
                        if (isURL(array[1])) {
                            pool.query('UPDATE URLs SET link = ? WHERE idUser = ?', [array[1], message.author.id], (err, data) => {
                                if (err) throw err;
                                if (data.affectedRows === 0) {
                                    pool.query('INSERT INTO URLs VALUES (NULL,?,?)', [message.author.id, array[1]], (err, data) => {
                                        if (err) throw err;
                                        console.log(data);
                                    })
                                } else {
                                    message.reply('Updated link');
                                }
                            })
                        } else {
                            message.reply('Wrong link');
                        }
                        break;
                    default:
                        console.log('Command and parameter not found');
                        break;
                }
            } else {
                switch (message.content.substring(1, 10).toLowerCase()) {
                    case 'entrada':
                        if (!serverMusic[message.guild.id].isPlaying) {
                            pool.query('SELECT link FROM URLs WHERE idUser = ?', [message.author.id], async (err, data) => {
                                if (err) throw err;
                                if (data[0]) {
                                    const url = Object.values(data[0])[0];
                                    if (!serverMusic[message.guild.id]) {
                                        serverMusic[message.guild.id].isPlaying = false;
                                    }
                                    if (message.member.voice.channel) {
                                        console.log(message.author.id)
                                        serverMusic[message.guild.id].channel = message.member.voice.channel;
                                        const connection = await serverMusic[message.guild.id].channel.join();
                                        serverMusic[message.guild.id].dispatcher = connection.play(ytdl(url, { filter: 'audioonly' }));
                                        serverMusic[message.guild.id].isPlaying = true;
                                        setTimeout(() => {
                                            serverMusic[message.guild.id].dispatcher.destroy();
                                            serverMusic[message.guild.id].isPlaying = false;
                                            serverMusic[message.guild.id].channel.leave();
                                        }, timeMusic);
                                    } else {
                                        message.reply('You need to join a voice channel first or Bot is playing now!');
                                    }
                                } else {
                                    message.reply("You don't have a link assignment. #set LINKSONG");
                                }
                            });
                        } else {
                            message.reply('Bot already playing');
                        }
                        break;
                    case 'pause':
                        if (serverMusic[message.guild.id]) {
                            serverMusic[message.guild.id].dispatcher.pause();
                            serverMusic[message.guild.id].isPlaying = false;
                        } else {
                            console.log('else pause');
                        }
                        break;
                    case 'resume':
                        if (!serverMusic[message.guild.id]) {
                            serverMusic[message.guild.id].dispatcher.resume();
                            serverMusic[message.guild.id].isPlaying = true;
                        } else {
                            console.log('else resume');
                        }
                        break;
                    case 'leave':
                        if (serverMusic[message.guild.id]) {
                            serverMusic[message.guild.id].dispatcher.destroy();
                            serverMusic[message.guild.id].isPlaying = false;
                            serverMusic[message.guild.id].channel.leave();
                        } else {
                            console.log('else leave');
                        }
                        break;
                    default:
                        console.log('Command not found');
                        break;
                }
            }
        } else {
            console.log('Error command');
        }
    }
})

client.on('voiceStateUpdate', (oldVoiceState, newVoiceState) => {
    const channelMusic = newVoiceState.guild.channels.cache.find(ch => ch.name === channelName);
    if (newVoiceState.channel && !newVoiceState.member.user.bot && !newVoiceState.deaf && !newVoiceState.mute && !newVoiceState.streaming && !oldVoiceState.channel) { // The member connected to a channel.
        console.log(`${newVoiceState.member.user.tag} connected to ${newVoiceState.channel.name}. Now are ${newVoiceState.channel.members.size} users.`);
        if (!newVoiceState.guild) return;
        if (!serverMusic[newVoiceState.guild.id]) {
            serverMusic[newVoiceState.guild.id] = {
                dispatcher: null,
                isPlaying: false,
                channel: null
            }
        }
        if (newVoiceState.channel.members.size >= 2 && !serverMusic[newVoiceState.guild.id].isPlaying) {
            pool.query('SELECT link FROM URLs WHERE idUser = ?', [newVoiceState.member.id], async (err, data) => {
                if (err) throw err;
                if (data[0]) {
                    const url = Object.values(data[0])[0];
                    if (isURL(url)) {
                        if (newVoiceState.member.voice.channel) {
                            serverMusic[newVoiceState.guild.id].channel = newVoiceState.member.voice.channel;
                            const connection = await serverMusic[newVoiceState.guild.id].channel.join();
                            serverMusic[newVoiceState.guild.id].dispatcher = connection.play(ytdl(url, { filter: 'audioonly' }));
                            serverMusic[newVoiceState.guild.id].isPlaying = true;
                            setTimeout(() => {
                                serverMusic[newVoiceState.guild.id].dispatcher.destroy();
                                serverMusic[newVoiceState.guild.id].isPlaying = false;
                                serverMusic[newVoiceState.guild.id].channel.leave();
                            }, timeMusic);
                        } else {
                            if (!channelMusic) return;
                            channelMusic.send('You need to join a voice channel first or bot is playing!');
                        }
                    } else {
                        if (!channelMusic) return;
                        channelMusic.send('Link expired. #set LINKSONG');
                    }
                } else {
                    if (!channelMusic) return;
                    channelMusic.send("You don't have a link assignment. #set LINKSONG");
                }
            });
        } else {
            channelMusic.send('Minimun 2 users to play or Im already playing!');
        }
    } else if (oldVoiceState.channel && !newVoiceState.member.user.bot) { // The member disconnected from a channel.
        //channelMusic.send("I've already played for you");
    } else {
        if (!newVoiceState.member.user.bot) {
            channelMusic.send("If you enter deaf or muted. I'm not going to play");
        }
    }
});
const isURL = link => {
    return ytdl.validateURL(link)
}