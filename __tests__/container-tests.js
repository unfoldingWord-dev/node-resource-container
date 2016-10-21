'use strict';

jest.mock('fs');
jest.mock('rimraf');
jest.unmock('compare-versions');
jest.unmock('../lib/utils/files');
jest.unmock('yamljs');
jest.unmock('../lib/utils/promises');
jest.unmock('../lib/main');

describe('Container', () => {
    let fs;
    let rc;
    let fileUtils;

    beforeEach(() => {
        fs = require('fs');
        rc = require('../');
        fileUtils = require('../lib/utils/files');
    });

    it('should load a container', () => {
        let container_path = 'res/container';

        fs.writeFileSync(container_path);
        fs.writeFileSync(container_path + '/package.json', JSON.stringify({
            package_version: rc.tools.spec.version,
            language: {},
            project: {},
            resource: {
                type: 'book'
            }
        }));
        fs.writeFileSync(container_path + '/content/config.yml', '---');
        fs.writeFileSync(container_path + '/content/toc.yml', '---');

        return rc.load(container_path)
            .then(function(container) {
                expect(container.path).toEqual(container_path);
            });
    });

    it('should convert a legacy bible resource', () => {
        let data = JSON.stringify({"chapters": [{"frames": [{"format": "usx", "id": "01-01", "img": "", "lastvs": "2", "text": "<para style=\"p\">\n\n  <verse number=\"1\" style=\"v\" />That which was from the beginning\u2014which we have heard, which we have seen with our eyes, which we have looked at, and our hands have touched\u2014it is about the Word of life.\n\n  <verse number=\"2\" style=\"v\" />Also, the life was made known, and we have seen it, and we bear witness to it. We are announcing to you the eternal life, which was with the Father, and which has been made known to us.\n"}, {"format": "usx", "id": "01-03", "img": "", "lastvs": "4", "text": "  <verse number=\"3\" style=\"v\" />That which we have seen and heard we declare also to you, so you also will have fellowship with us. Our fellowship is with the Father and with his Son, Jesus Christ. \n\n  <verse number=\"4\" style=\"v\" />Also, we are writing these things to you so that our joy will be complete.\n\n<note caller=\"+\" style=\"f\">\n\n  <char style=\"ft\">Some older versions read, </char>\n\n  <char style=\"fqa\">And we are writing these things to you so that your joy will be complete. </char>\n\n  <char style=\"fqb\"></char>\n\n</note></para>\n\n<para style=\"b\" />\n"}, {"format": "usx", "id": "01-05", "img": "", "lastvs": "7", "text": "<para style=\"p\">\n\n  <verse number=\"5\" style=\"v\" />This is the message that we have heard from him and are announcing to you: God is light, and in him there is no darkness at all.\n\n  <verse number=\"6\" style=\"v\" />If we say that we have fellowship with him and walk in darkness, we are lying and are not practicing the truth.\n\n  <verse number=\"7\" style=\"v\" />But if we walk in the light as he is in the light, we have fellowship with one another, and the blood of Jesus his Son cleanses us from every sin.\n"}, {"format": "usx", "id": "01-08", "img": "", "lastvs": "10", "text": "  <verse number=\"8\" style=\"v\" />If we say that we have no sin, we are deceiving ourselves, and the truth is not in us.\n\n  <verse number=\"9\" style=\"v\" />But if we confess our sins, he is faithful and just to forgive us our sins and cleanse us from all unrighteousness.\n\n  <verse number=\"10\" style=\"v\" />If we say that we have not sinned, we make him out to be a liar, and his word is not in us.</para>\n"}], "number": "01", "ref": "", "title": ""}, {"frames": [{"format": "usx", "id": "02-01", "img": "", "lastvs": "3", "text": "<para style=\"p\">\n\n  <verse number=\"1\" style=\"v\" />Children, I am writing these things to you so that you will not sin. But if anyone sins, we have an advocate with the Father, Jesus Christ, the one who is righteous.\n\n  <verse number=\"2\" style=\"v\" />He is the propitiation for our sins, and not for ours only, but also for the whole world.\n\n  <verse number=\"3\" style=\"v\" />By this we know that we know him: if we keep his commandments.\n"}, {"format": "usx", "id": "02-04", "img": "", "lastvs": "6", "text": "  <verse number=\"4\" style=\"v\" />The one who says, \"I know God,\" but does not keep his commandments, is a liar, and the truth is not in him.\n\n  <verse number=\"5\" style=\"v\" />But whoever keeps his word, truly, it is in that person that the love of God has been perfected. By this we know that we are in him.\n\n  <verse number=\"6\" style=\"v\" />The one who says he remains in God should himself also walk just as Jesus Christ walked.</para>\n"}, {"format": "usx", "id": "02-07", "img": "", "lastvs": "8", "text": "<para style=\"p\">\n\n  <verse number=\"7\" style=\"v\" />Beloved, I am not writing a new commandment to you, but an old commandment that you have had from the beginning. The old commandment is the word that you heard.\n\n  <verse number=\"8\" style=\"v\" />Yet I am writing a new commandment to you, which is true in Christ and in you, because the darkness is passing away, and the true light is already shining.\n"}, {"format": "usx", "id": "02-09", "img": "", "lastvs": "11", "text": "  <verse number=\"9\" style=\"v\" />The one who says that he is in the light and hates his brother is in the darkness until now.\n\n  <verse number=\"10\" style=\"v\" />The one who loves his brother remains in the light and there is no occasion for stumbling in him.\n\n  <verse number=\"11\" style=\"v\" />But The one who hates his brother is in the darkness and walks in the darkness; he does not know where he is going, because the darkness has blinded his eyes.</para>\n"}, {"format": "usx", "id": "02-12", "img": "", "lastvs": "14", "text": "<para style=\"p\">\n\n  <verse number=\"12\" style=\"v\" />I am writing to you, dear children, because your sins are forgiven because of his name.\n\n  <verse number=\"13\" style=\"v\" />I am writing to you, fathers, because you know the one who is from the beginning. I am writing to you, young men, because you have overcome the evil one. I have written to you, little children, because you know the Father.\n\n  <verse number=\"14\" style=\"v\" />I have written to you, fathers, because you know the one who is from the beginning. I have written to you, young men, because you are strong, and the word of God remains in you, and you have overcome the evil one.\n"}, {"format": "usx", "id": "02-15", "img": "", "lastvs": "17", "text": "  <verse number=\"15\" style=\"v\" />Do not love the world nor the things that are in the world. If anyone loves the world, the love of the Father is not in him.\n\n  <verse number=\"16\" style=\"v\" />For everything that is in the world\u2014the lust of the flesh, the lust of the eyes, and the arrogance of life\u2014is not from the Father but is from the world.\n\n  <verse number=\"17\" style=\"v\" />The world and its desire are passing away. But whoever does the will of God will remain forever.</para>\n\n<para style=\"b\" />\n"}, {"format": "usx", "id": "02-18", "img": "", "lastvs": "19", "text": "<para style=\"p\">\n\n  <verse number=\"18\" style=\"v\" />Little children, it is the last hour. Just as you heard that the antichrist is coming, now many antichrists have come. By this we know that it is the last hour.\n\n  <verse number=\"19\" style=\"v\" />They went out from us, but they were not from us. For if they had been from us they would have remained with us. But when they went out, that showed they were not from us.\n"}, {"format": "usx", "id": "02-20", "img": "", "lastvs": "21", "text": "  <verse number=\"20\" style=\"v\" />But you have an anointing from the Holy One, and you all know the truth.\n\n<note caller=\"+\" style=\"f\">\n\n  <char style=\"ft\">Some other modern versions read, </char>\n\n  <char style=\"fqa\">and you have all knowledge. </char>\n\n  <char style=\"fqb\">Some older versions read, </char>\n\n  <char style=\"fqa\">and you know all things. </char>\n\n  <char style=\"fqb\"></char>\n\n</note>\n\n  <verse number=\"21\" style=\"v\" />I did not write to you because you do not know the truth, but because you know it and because no lie is from the truth.\n"}, {"format": "usx", "id": "02-22", "img": "", "lastvs": "23", "text": "  <verse number=\"22\" style=\"v\" />Who is the liar but the one who denies that Jesus is the Christ? That person is the antichrist, since he denies the Father and the Son.\n\n  <verse number=\"23\" style=\"v\" />No one who denies the Son has the Father. Whoever acknowledges the Son also has the Father.\n"}, {"format": "usx", "id": "02-24", "img": "", "lastvs": "26", "text": "  <verse number=\"24\" style=\"v\" />As for you, let what you have heard from the beginning remain in you. If what you heard from the beginning remains in you, you will also remain in the Son and in the Father.\n\n  <verse number=\"25\" style=\"v\" />And this is the promise he gave to us: eternal life.\n\n  <verse number=\"26\" style=\"v\" />I have written these things to you about those who would lead you astray.\n"}, {"format": "usx", "id": "02-00", "img": "", "lastvs": "29", "text": "  <verse number=\"27\" style=\"v\" />As for you, the anointing that you received from him remains in you, and you do not need anyone to teach you. But as his anointing teaches you everything and is true and is not a lie, and just as it has taught you, remain in him.</para>\n\n<para style=\"p\">\n\n  <verse number=\"28\" style=\"v\" />And now, dear children, remain in him, so that when he appears, we will have boldness and not be ashamed before him at his coming.\n\n  <verse number=\"29\" style=\"v\" />If you know that he is righteous, you know that everyone who does what is right has been born from him.</para>\n"}], "number": "02", "ref": "", "title": ""}], "date_modified": "20160830"});
        let props = {
            language: {
                slug: 'en',
                name: 'English'
            },
            project: {
                slug: '1jn',
                name: '1 John'
            },
            resource: {
                slug: 'ulb',
                name: 'Unlocked Literal Bible',
                type: 'book',
                modified_at: 0,
                status: {
                    license: 'some license'
                }
            }
        };

        return rc.tools.convertResource(data, 'bible_container', props)
            .then(function(container) {
                // ensure no chunk 00 bug
                expect(fileUtils.fileExists('bible_container/content/02/00.usx')).toEqual(false);
                expect(fileUtils.fileExists('bible_container/content/02/27.usx')).toEqual(true);
                expect(fileUtils.fileExists('bible_container/content/01/01.usx')).toEqual(true);
                expect(fileUtils.fileExists('bible_container/package.json')).toEqual(true);
                expect(fileUtils.fileExists('bible_container/content/front/title.usx')).toEqual(true);
                expect(fileUtils.fileExists('bible_container/content/02/title.usx')).toEqual(true);
            });
    });

    it('should localize some chapter titles', () => {
        expect(rc.tools.localizeChapterTitle("en", 1)).toEqual('Chapter 1');
        expect(rc.tools.localizeChapterTitle("en", '01')).toEqual('Chapter 1');
        expect(rc.tools.localizeChapterTitle("en", 'invalid')).toEqual('Chapter invalid');
        expect(rc.tools.localizeChapterTitle("en", 20)).toEqual('Chapter 20');
        expect(rc.tools.localizeChapterTitle("ar", 1)).toEqual('الفصل 1');
        expect(rc.tools.localizeChapterTitle("ar", 20)).toEqual('الفصل 20');
        expect(rc.tools.localizeChapterTitle("ru", 1)).toEqual('Глава 1');
        expect(rc.tools.localizeChapterTitle("hu", 1)).toEqual('1. fejezet');
        expect(rc.tools.localizeChapterTitle("sr-Latin", 1)).toEqual('Поглавље 1');
        expect(rc.tools.localizeChapterTitle("missing", 1)).toEqual('Chapter 1');

    });

    it('should convert a legacy obs resource', () => {
        let data = JSON.stringify({"chapters": [{"frames": [{"id": "01-01", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-01.jpg", "text": "This is how the beginning of everything happened. God created the universe and everything in it in six days. After God created the earth it was dark and empty, and nothing had been formed in it. But God\u2019s Spirit was there over the water."}, {"id": "01-02", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-02.jpg", "text": "Then God said, \u201cLet there be light!\u201d And there was light. God saw that the light was good and called it \u201cday.\u201d He separated it from the darkness, which he called \u201cnight.\u201d God created the light on the first day of creation."}, {"id": "01-03", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-03.jpg", "text": "On the second day of creation, God spoke and created the sky above the earth. He made the sky by separating the water above from the water below."}, {"id": "01-04", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-04.jpg", "text": "On the third day, God spoke and separated the water from the dry land. He called the dry land \u201cearth,\u201d and he called the water \u201cseas.\u201d God saw that what he had created was good."}, {"id": "01-05", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-05.jpg", "text": "Then God said, \u201cLet the earth produce all kinds of trees and plants.\u201d And that is what happened. God saw that what he had created was good."}, {"id": "01-06", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-06.jpg", "text": "On the fourth day of creation, God spoke and made the sun, the moon, and the stars. God made them to give light to the earth and to mark day and night, seasons and years. God saw that what he had created was good."}, {"id": "01-07", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-07.jpg", "text": "On the fifth day, God spoke and made everything that swims in the water and all the birds. God saw that it was good, and he blessed them."}, {"id": "01-08", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-08.jpg", "text": "On the sixth day of creation, God said, \u201cLet there be all kinds of land animals!\u201d And it happened just like God said. Some were farm animals, some crawled on the ground, and some were wild. And God saw that it was good."}, {"id": "01-09", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-09.jpg", "text": "Then God said, \u201cLet us make human beings in our image to be like us. They will have authority over the earth and all the animals.\u201d"}, {"id": "01-10", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-10.jpg", "text": "So God took some dirt, formed it into a man, and breathed life into him. This man\u2019s name was Adam. God planted a garden where Adam could live, and put him there to care for it."}, {"id": "01-11", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-11.jpg", "text": "In the middle of the garden, God planted two special trees\u2014the tree of life and the tree of the knowledge of good and evil. God told Adam that he could eat from any tree in the garden except from the tree of the knowledge of good and evil. If he ate from this tree, he would die."}, {"id": "01-12", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-12.jpg", "text": "Then God said, \u201cIt is not good for man to be alone.\u201d But none of the animals could be Adam\u2019s helper."}, {"id": "01-13", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-13.jpg", "text": "So God made Adam fall into a deep sleep. Then God took one of Adam\u2019s ribs and made it into a woman and brought her to him."}, {"id": "01-14", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-14.jpg", "text": "When Adam saw her, he said, \u201cAt last! This one is like me! Let her be called \u2018Woman,\u2019 for she was made from Man.\u201d This is why a man leaves his father and mother and becomes one with his wife."}, {"id": "01-15", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-15.jpg", "text": "God made man and woman in his own image. He blessed them and told them, \u201cHave many children and grandchildren and fill the earth!\u201d And God saw that everything he had made was very good, and he was very pleased with all of it. This all happened on the sixth day of creation."}, {"id": "01-16", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-01-16.jpg", "text": "When the seventh day came, God had finished his work. So God rested from all he had been doing. He blessed the seventh day and made it holy, because on this day he rested from his work. This is how God created the universe and everything in it."}], "number": "01", "ref": "A Bible story from: Genesis 1-2", "title": "1. The Creation"}, {"frames": [{"id": "02-01", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-01.jpg", "text": "Adam and his wife were very happy living in the beautiful garden God had made for them. Neither of them wore clothes, but this did not cause them to feel any shame, because there was no sin in the world. They often walked in the garden and talked with God."}, {"id": "02-02", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-02.jpg", "text": "But there was a crafty snake in the garden. He asked the woman, \u201cDid God really tell you not to eat the fruit from any of the trees in the garden?\u201d"}, {"id": "02-03", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-03.jpg", "text": "The woman answered, \u201cGod told us we could eat the fruit of any tree except from the tree of the knowledge of good and evil. God told us, \u2018If you eat that fruit or even touch it, you will die.\u2019\u201d"}, {"id": "02-04", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-04.jpg", "text": "The snake responded to the woman, \u201cThat is not true! You will not die. God just knows that as soon as you eat it, you will be like God and will understand good and evil like he does.\u201d"}, {"id": "02-05", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-05.jpg", "text": "The woman saw that the fruit was beautiful and looked delicious. She also wanted to be wise, so she picked some of the fruit and ate it. Then she gave some to her husband, who was with her, and he ate it, too."}, {"id": "02-06", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-06.jpg", "text": "Suddenly, their eyes were opened, and they realized they were naked. They tried to cover their bodies by sewing leaves together to make clothes."}, {"id": "02-07", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-07.jpg", "text": "Then the man and his wife heard the sound of God walking through the garden. They both hid from God. Then God called to the man, \u201cWhere are you?\u201d Adam replied, \u201cI heard you walking in the garden, and I was afraid, because I was naked. So I hid.\u201d"}, {"id": "02-08", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-08.jpg", "text": "Then God asked, \u201cWho told you that you were naked? Did you eat the fruit I told you not to eat?\u201d The man answered, \u201cYou gave me this woman, and she gave me the fruit.\u201d Then God asked the woman, \u201cWhat have you done?\u201d The woman replied, \u201cThe snake tricked me.\u201d"}, {"id": "02-09", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-09.jpg", "text": "God said to the snake, \u201cYou are cursed! You will slide on your belly and eat dirt. You and the woman will hate each other, and your children and her children will hate each other, too. The woman\u2019s descendant will crush your head, and you will wound his heel.\u201d"}, {"id": "02-10", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-10.jpg", "text": "God then said to the woman, \u201cI will make childbirth very painful for you. You will desire your husband, and he will rule over you.\u201d"}, {"id": "02-11", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-11.jpg", "text": "God said to the man, \u201cYou listened to your wife and disobeyed me. Now the ground is cursed, and you will need to work hard to grow food. Then you will die, and your body will return to dirt.\u201d The man named his wife Eve, which means \u201clife-giver,\u201d because she would become the mother of all people. And God clothed Adam and Eve with animal skins."}, {"id": "02-12", "img": "https://api.unfoldingword.org/obs/jpg/1/en/360px/obs-en-02-12.jpg", "text": "Then God said, \u201cNow that the human beings have become like us by knowing good and evil, they must not be allowed to eat the fruit of the tree of life and live forever.\u201d So God sent Adam and Eve away from the beautiful garden. God placed powerful angels at the entrance to the garden to keep anyone from eating the fruit of the tree of life."}], "number": "02", "ref": "A Bible story from: Genesis 3", "title": "2. Sin Enters the World"}, ], "date_modified": "20150826", "direction": "ltr", "language": "en"});
        let props = {
            language: {
                slug: 'en',
                name: 'English'
            },
            project: {
                slug: 'obs',
                name: 'Open Bible Stories'
            },
            resource: {
                slug: 'obs',
                name: 'Open Bible Stories',
                type: 'book',
                status: {
                    license: 'some license'
                }
            },
            modified_at: 100,
            tw_assignments: {"02":{"01":["adam","god", "sin"],"02":["god"]}}
        };

        return rc.tools.convertResource(data, 'obs_container', props)
            .then(function(container) {
                expect(fileUtils.fileExists('obs_container/content/01/title.md')).toEqual(true);
                expect(fileUtils.fileExists('obs_container/content/01/reference.md')).toEqual(true);
                expect(fileUtils.fileExists('obs_container/content/01/01.md')).toEqual(true);
                expect(fileUtils.fileExists('obs_container/package.json')).toEqual(true);
                expect(fileUtils.fileExists('obs_container/content/front/title.md')).toEqual(true);
                expect(container.config.content['02']['01'].words).toEqual(['adam', 'god', 'sin']);
                expect(container.info.modified_at).toEqual(props.modified_at);
            });
    });

    it('should convert a legacy tw resource', () => {
        let data = JSON.stringify([{
            aliases:["religious leaders"],
            cf: ["priest", "jew"],
            def: "The Jewish leaders were religious leaders, such as priests and experts in God's laws.<ul><li>Many of the religious leaders did not believe that Jesus was the Messiah and Son of God. They were jealous of Jesus and did not want other people to believe in him either.</li><li>Some of the religious leaders did believe in Jesus--especially after he rose from the dead.</li><li>Many of the religious leaders believed that they were more righteous than other people, and they were too proud to admit their sins. They lied about Jesus to the Roman rulers and demanded that he be killed.</li><li>Jesus condemned the Jewish leaders for being hypocrites. They claimed to know God, but did not obey him.</li></ul>",
            def_title: "Facts",
                ex: [
                    {ref: "24-03", text: "Many <b>religious leaders</b> also came to be baptized by John, but they did not repent or confess their sins."},
                    {ref: "37-11", text: "But the <b>religious leaders of the Jews</b> were jealous, so they gathered together to plan how they could kill Jesus and Lazarus."},
                    {ref: "38-02", text: "He (Judas) knew that the <b>Jewish leaders</b> denied that Jesus was the Messiah and that they were plotting to kill him."}
            ],
            id: "jewishleaders",
            sub: "",
            term: "Jewish leaders"
        }]);
        let props = {
            language: {
                slug: 'en',
                name: 'English'
            },
            project: {
                slug: 'bible',
                name: 'translationWords'
            },
            resource: {
                slug: 'tw',
                name: 'translationWords',
                type: 'dict',
                status: {
                    license: 'some license'
                }
            },
            modified_at: 100,
        };

        return rc.tools.convertResource(data, 'tw_container', props)
            .then(function(container) {
                expect(fileUtils.fileExists('tw_container/content/jewishleaders/01.md')).toEqual(true);
                expect(fileUtils.fileExists('tw_container/package.json')).toEqual(true);
                expect(fileUtils.fileExists('tw_container/content/front/title.md')).toEqual(false);
                expect(container.config['jewishleaders']['def_title']).toEqual('Facts');
                expect(container.info.modified_at).toEqual(props.modified_at);
            });
    });

    it('should convert a tA resource', () => {
        let data = JSON.stringify({
            articles: [
                {
                    depend: [
                        "ta_intro",
                        "translation_guidelines",
                        "finding_answers"
                    ],
                    id: "translate_manual",
                    question: "What is the Translation Manual?",
                    recommend: [
                        "translate_why",
                        "guidelines_intro",
                        "translate_process",
                        "translation_difficulty"
                    ],
                    ref: "vol1/translate/translate_manual",
                    text: "### What Does the Translation Manual Teach? This manual teaches translation theory and how to make a good translation for Other Languages (OLs). Some of the principles of translation in this manual also apply to Gateway Language translation. For specific instruction on how to translate the set of translation tools for Gateway Languages, however, please see the Gateway Language Manual. It will be very helpful to study many of these modules before starting any type of translation project. Other modules, such as the ones about grammar",
                    title: "Introduction to Translation Manual"
                },
                {
                    depend: [
                        "translate_manual"
                    ],
                    id: "translate_terms",
                    question: "What terms should I know?",
                    recommend: [
                        "translate_whatis"
                    ],
                    ref: "vol1/translate/translate_terms",
                    text: "### Important Words to Know *Note: These are terms that the Translation Manual will use to talk about language. The translator will need to understand these terms in order to use the Translation Manual.* **Term** - A word or phrase that refers to one thing, idea, or action. For example, the term in English for pouring liquid into one's mouth is \"drink.\" The term for a ceremony that marks an important transition in someone's life is \"rite of passage.\" The difference between a term and a word is that a term can contain several words. **Text** - A text is something that a speaker or writer is communicating to a hearer or reader by means of language. The speaker or writer has a certain meaning in mind, and so he or she chooses a form of the language to express that meaning. **Context** - The words, phrases, sentences, and paragraphs surrounding the word, phrase, or sentence in question. The context is the text that surrounds the part of the text that you are examining. The meaning of individual words and phrases can change when they are in different contexts. **Form** - The structure of the language as it appears on the page or as it is spoken.",
                title: "Terms to Know"
            }],
            toc: "Translation Manual Volume 1 - Introduction - [Introduction to the Translation Manual](translate_manual) - [Terms to Know](translate_terms) - [What is Translation](translate_whatis) - [More about Translation](translate_more) - [How to Aim Your Bible Translation](translate_aim) - Defining a Good Translation - [The Qualities of a Good Translation](guidelines_intro) - [Create Clear Translations](guidelines_clear) - [Create Natural Translations](guidelines_natural) - [Create Accurate Translations](guidelines_accurate) - [Create Church-Approved Translations](guidelines_church_approved) - Meaning-Based Translation - [The Translation Process](translate_process) - [Discover the Meaning of the Text](translate_discover) - [Re-telling the Meaning](translate_retell) - [Form and Meaning](translate_fandm) - [The Importance of Form](translate_form) - [Levels of Meaning](translate_levels) - [Literal Translations](translate_literal) - [Word for Word Substitution](translate_wforw) - [Problems with Literal Translations](translate_problem) - [Meaning-Based Translations](translate_dynamic) - [Translate for Meaning](translate_tform) - Before Translating - [First Draft](first_draft) - [Choosing a Translation Team](choose_team) - [Translator Qualifications](qualifications) - [Choosing What to Translate](translation_difficulty) - [Choosing a Source Text](translate_source_text) - [Copyrights, Licensing, and Source Texts](translate_source_licensing) - [Source Texts and Version Numbers](translate_source_version) - [Decisions for Writing Your Language](writing_decisions) - [File Formats](file_formats) - How to Start Translating - [MAST Core Concepts](mast) - [Help with Translating](translate_help) - Use the translationHelps when Translating - [Notes with Links](resources_links) - [Using the translationNotes](resources_types) - [Connecting Statement and General Information in the Notes](resources_connect) - [Notes with Definitions](resources_def) - [Notes that Explain](resources_eplain) - [Notes with Synonyms and Equivalent Phrases](resources_synequi) - [Notes with Alternate Translations (AT)](resources_alter) - [Notes that Clarify the UDB Translation](resources_clarify) - [Notes that have Alternate Meanings](resources_alterm) - [Notes with Probable or Possible Meanings](resources_porp) - [Notes that Identify Figures of Speech](resources_fofs) - [Notes that Identify Indirect and Direct Quotes](resources_iordquote) - [Notes for Long ULB Phrases](resources_long) - [Using translationWords](resources_words) - [Using translationQuestions](resources_questions) - Just-in-Time Learning Volume 1 - Figures of Speech - [Figures of Speech](figs_intro) - [Idiom](figs_idiom) - [Irony](figs_irony) - [Metaphor](figs_metaphor) - [Rhetorical Question](figs_rquestion) - [Simile](figs_simile) - Grammar - [Forms of You](figs_you) - [Forms of 'You' - Dual/Plural](figs_youdual) - [Forms of 'You' - Singular](figs_yousingular) - [Order of Events](figs_events) - [Word Order](figs_order) - Unknowns - [Translate Unknowns](translate_unknown) - [Copy or Borrow Words](translate_transliterate) - [How to Translate Names](translate_names) - [Assumed Knowledge and Implicit Information](figs_explicit) - [Making Assumed Knowledge and Implicit Information Explicit](figs_explicitinfo) - [When to Keep Information Implicit](figs_extrainfo) - Writing Styles - [Parables](figs_parables) - [Hyperthoetical Situations](figs_hypo) "
        });
        let props = {
            language: {
                slug: 'en',
                name: 'English'
            },
            project: {
                slug: 'ta-translate',
                name: 'Translate Manual'
            },
            resource: {
                slug: 'vol1',
                name: 'Volume 1',
                type: 'man',
                status: {
                    license: 'CC BY-SA 4.0'
                }
            },
            modified_at: 100,
        };

        return rc.tools.convertResource(data, 'ta_container', props)
            .then(function(container) {
                expect(container).not.toEqual(null);
                expect(fileUtils.fileExists('ta_container/content/translate-manual/title.md')).toEqual(true);
                expect(fileUtils.fileExists('ta_container/content/translate-manual/sub-title.md')).toEqual(true);
                expect(fileUtils.fileExists('ta_container/content/translate-manual/01.md')).toEqual(true);
                expect(fileUtils.fileExists('ta_container/content/config.yml')).toEqual(true);
                expect(fileUtils.fileExists('ta_container/package.json')).toEqual(true);
                expect(container.info.project.slug).toEqual('ta-translate');
                expect(container.info.content_mime_type).toEqual('text/markdown');
                expect(container.config.content['translate-manual']).not.toEqual(null);
                expect(container.toc[0].chapter).toEqual('front');
                expect(container.toc[1].chapter).toEqual('translate-manual');
                expect(container.toc[2].chapter).toEqual('translate-terms');
                expect(container.toc.length).toEqual(3);
            });
    });
});