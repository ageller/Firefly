## June 11, 2019: We have a *very* large .git directory (>600MB)

We assume this is because we accidentally committed large data files in the past, and though we removed them, they still hang around in the history.  Here are the steps we took to clean that out, following [this website](https://support.acquia.com/hc/en-us/articles/360004334093-Removing-large-files-from-Git-without-losing-history):

1. Check the pack files
```
$ du -h .git/objects/pack/*

 12K	.git/objects/pack/pack-0714c1fbca2fc53f34cde1797d08bf92db8477f9.idx
6.0M	.git/objects/pack/pack-0714c1fbca2fc53f34cde1797d08bf92db8477f9.pack
104K	.git/objects/pack/pack-25be8d9a8a441c73e42b9a2c3f1838ed5cac1c68.idx
591M	.git/objects/pack/pack-25be8d9a8a441c73e42b9a2c3f1838ed5cac1c68.pack
```

2. Show the 20 largest items in a pack ([verify-pack output format](https://git-scm.com/docs/git-verify-pack#_output_format) is "SHA-1 type size size-in-packfile offset-in-packfile"):
```
$ git verify-pack -v .git/objects/pack/pack-25be8d9a8a441c73e42b9a2c3f1838ed5cac1c68.pack | sort -k 3 -n | tail -n 20

59b5ddec8cca20623a50375e37ac15059071ed28 blob   1302587 596227 469525203
671f1feb9b28e045f339f924fe06bad53eaae68f blob   1302638 596537 447191482
5c8e4a26808928c7cd9c4fd1586bb296ba5a5112 blob   1302644 596542 352319647
57fbd9ebe26041f9e613707aa980da72720e8b89 blob   1302675 596394 379156296
7f9e1a0b3349cabb4fd131575ba8858de0b0a876 blob   1302684 596583 501028313
9d2d1075262041fd72b2cd2056ca702e2ee20f97 blob   1302689 596088 492084344
ec9b5b19ff2e3fbfb89651314e7f8fce7a13e016 blob   1302696 596428 479760877
eaf39ef6ed319e8e6d1b3a49293101affda54f1e blob   1302725 596558 514149401
fcfe9ea5d2bd4132ffdab469443d0ed60ef21ed0 blob   1302750 596165 470121430
241fc72277e85acc0ba64dc5b2d97d67cb13abb3 blob   1389013 635672 591404352
ca12bfe86df66ccff149c70dd5d7b3f9c575b4af blob   1389034 635790 590350192
68e9fca3d333fe7a7ae7648bc9ba79b7ffb29b6c blob   1593536 1593282 5385426
1ad60bb956d6ae67d6a54a2711f2a1fb7e3b5f33 blob   3860222 1779245 580125277
f33a047c0648933a5a363c331b55be2b733ed98b blob   4563534 2067719 588240354
7c0e3adbe70d81c09ed2782c7f587808f83bb8bf blob   4563659 2067457 574715866
ba969051bd18e93d783d4a82e962203a41bd102a blob   4563945 2066620 566320156
b7fb7050a98358fe02c9c6706d072cc9fd08fb50 blob   7189245 3338680 576786597
83ae118748a64bf976d9734ed17fd7e93274f419 blob   13889672 6330184 559989865
ee93c909a20807b9c72a4f91120061c80920e9d2 blob   13890188 6327279 568388587
3dade8746a1eefdd760350e661232e1cae47ae0e blob   13890607 6328992 581911362
```

3. It looks like the bottom 8 or 9 are above the average size.  We can view the pack object like this:
```
$ git rev-list --objects --all | grep -e 3dade8746a1eefdd760350e661232e1cae47ae0e -e ee93c909a20807b9c72a4f91120061c80920e9d2 -e 83ae118748a64bf976d9734ed17fd7e93274f419 -e b7fb7050a98358fe02c9c6706d072cc9fd08fb50 -e ba969051bd18e93d783d4a82e962203a41bd102a -e 7c0e3adbe70d81c09ed2782c7f587808f83bb8bf -e f33a047c0648933a5a363c331b55be2b733ed98b -e 1ad60bb956d6ae67d6a54a2711f2a1fb7e3b5f33 -e 68e9fca3d333fe7a7ae7648bc9ba79b7ffb29b6c

68e9fca3d333fe7a7ae7648bc9ba79b7ffb29b6c src/docs/screenGrab.png
83ae118748a64bf976d9734ed17fd7e93274f419 data/FIREdataGas.json
ba969051bd18e93d783d4a82e962203a41bd102a data/FIREdataStars.json
ee93c909a20807b9c72a4f91120061c80920e9d2 data/FIREdataGas.json
7c0e3adbe70d81c09ed2782c7f587808f83bb8bf data/FIREdataStars.json
b7fb7050a98358fe02c9c6706d072cc9fd08fb50 data/FIREdataGas.json
1ad60bb956d6ae67d6a54a2711f2a1fb7e3b5f33 data/FIREdataStars.json
3dade8746a1eefdd760350e661232e1cae47ae0e data/FIREdataGas.json
f33a047c0648933a5a363c331b55be2b733ed98b data/FIREdataStars.json
```

4. The next step on [that website](https://support.acquia.com/hc/en-us/articles/360004334093-Removing-large-files-from-Git-without-losing-history) is to use git filter-branch.  This seems complicated (and a bit scary).  But there is also a 3rd party tool that looks really nice : [BFG](https://rtyley.github.io/bfg-repo-cleaner/).  We'll try that.  (Note: I aliased the command bfg to point to the bfg-1.13.0.jar file in my bin directory.)
```
$ git clone --mirror https://github.com/ageller/Firefly.git
```

5. Try removing all jsons
```
$ bfg --delete-files *json  Firefly.git

Using repo : /Users/ageller/Desktop/tmp/cleanFirefly/Firefly.git

Found 81 objects to protect
Found 11 commit-pointing refs : HEAD, refs/heads/abg_dev, refs/heads/colorbarDivBroken, ...

Protected commits
-----------------

These are your protected commits, and so their contents will NOT be altered:

 * commit 672b4aad (protected by 'HEAD') - contains 17 dirty files : 
	- data/isolatedGalaxy_s50/FIREDataGas000.json (1.1 MB)
	- data/isolatedGalaxy_s50/FIREDataGas001.json (1.1 MB)
	- ...

WARNING: The dirty content above may be removed from other commits, but as
the *protected* commits still use it, it will STILL exist in your repository.

Details of protected dirty content have been recorded here :

/Users/ageller/Desktop/tmp/cleanFirefly/Firefly.git.bfg-report/2019-06-11/10-21-28/protected-dirt/

If you *really* want this content gone, make a manual commit that removes it,
and then run the BFG on a fresh copy of your repo.
       

Cleaning
--------

Found 356 commits
Cleaning commits:       100% (356/356)
Cleaning commits completed in 555 ms.

Updating 10 Refs
----------------

	Ref                            Before     After   
	--------------------------------------------------
	refs/heads/abg_dev           | 0a5a9fce | 432f24ba
	refs/heads/colorbarDivBroken | 343065c5 | dcd353eb
	refs/heads/master            | 672b4aad | f8436e2c
	refs/pull/1/head             | 80200e84 | e5ba8fdd
	refs/pull/15/head            | ed2b7f68 | b5501b8f
	refs/pull/22/head            | ef6a5583 | c78a308c
	refs/pull/25/head            | a8a26fc8 | 436721f8
	refs/pull/26/head            | 0a5a9fce | 432f24ba
	refs/pull/30/head            | eab3ac41 | 4dfdea0e
	refs/tags/v1.0               | 433ccb55 | 50392307

Updating references:    100% (10/10)
...Ref update completed in 32 ms.

Commit Tree-Dirt History
------------------------

	Earliest                                              Latest
	|                                                          |
	DDDDDmmmmDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD

	D = dirty commits (file tree fixed)
	m = modified commits (commit message or parents changed)
	. = clean commits (no changes to file tree)

	                        Before     After   
	-------------------------------------------
	First modified commit | d1bd1aa8 | b4fe4e6e
	Last dirty commit     | ce4dc8c6 | d0f721c2

Deleted files
-------------

	Filename                  Git id                                                       
	---------------------------------------------------------------------------------------
	FIREDataGas000.json     | e1c7097b (1.1 MB), 0730363a (1.1 MB), 2db2e6fd (1.1 MB)      
	FIREDataGas001.json     | 6b02e4ab (1.1 MB), 8b4a017d (1.1 MB), fc3fff0b (1.1 MB)      
	FIREDataGas002.json     | 928dcfd2 (1.1 MB), fa13562a (1.1 MB), e9d0e6f7 (1.1 MB)      
	FIREDataGas003.json     | b9185715 (1.1 MB), d98ddcc9 (1.1 MB), 638d7a4b (1.1 MB)      
	FIREDataGas004.json     | ecae8fb4 (1.1 MB), f48e6f91 (1.1 MB), 32ae26cb (1.1 MB)      
	FIREDataGas005.json     | 58212775 (1.1 MB), b8bee843 (1.1 MB), 106db3e8 (1.1 MB)      
	FIREDataGas006.json     | f32eb248 (1.1 MB), fa9171c8 (1.1 MB), 583738cd (1.1 MB)      
	FIREDataGas007.json     | 89e5985c (1.1 MB), 4ec502da (1.1 MB), bae8fce0 (1.1 MB)      
	FIREDataGas008.json     | 5a5a6bd0 (1.1 MB), 300772ed (1.1 MB), 69ed6048 (1.1 MB)      
	FIREDataGas009.json     | ee933a94 (1.1 MB), 94aa4b2f (1.1 MB), 0bad4c5e (1.1 MB)      
	FIREDataGas010.json     | 9b2e07ea (753.7 KB), 59e1c9aa (753.3 KB), 42688011 (753.2 KB)
	FIREDataOptions.json    | eaad65a6 (1.0 KB), d0ff5703 (1.1 KB), be8e1548 (844 B)       
	FIREDataStars000.json   | b9efe8d5 (445.6 KB), e10f089f (445.7 KB), 872f65f0 (445.8 KB)
	FIREdataGas.json        | ca12bfe8 (1.3 MB), 241fc722 (1.3 MB), ...                    
	FIREdataGas000.json     | ff1ade77 (1004.6 KB), cecb2763 (1.2 MB), ...                 
	...


In total, 857 object ids were changed. Full details are logged here:

	/Users/ageller/Desktop/tmp/cleanFirefly/Firefly.git.bfg-report/2019-06-11/10-21-28

BFG run is complete! When ready, run: git reflog expire --expire=now --all && git gc --prune=now --aggressive


--
You can rewrite history in Git - don't let Trump do it for real!
Trump's administration has lied consistently, to make people give up on ever
being told the truth. Don't give up: https://github.com/bkeepers/stop-trump
--


```

6. Now remove the files
```
$ cd Firefly.git
$ git reflog expire --expire=now --all && git gc --prune=now --aggressive

Counting objects: 1822, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (1788/1788), done.
Writing objects: 100% (1822/1822), done.
Total 1822 (delta 1200), reused 201 (delta 0)
```

7. Check the size
```
$ du -h
9.6M	./objects/pack
4.0K	./objects/info
9.6M	./objects
8.0K	./info
 44K	./hooks
  0B	./refs/pull
  0B	./refs/heads
  0B	./refs/tags
  0B	./refs
9.6M	.
```

8.  Try to push
```
$ git push
Counting objects: 1822, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (588/588), done.
Writing objects: 100% (1822/1822), 9.50 MiB | 11.88 MiB/s, done.
Total 1822 (delta 1200), reused 1822 (delta 1200)
remote: Resolving deltas: 100% (1200/1200), done.
To https://github.com/ageller/Firefly.git
 + 0a5a9fc...432f24b abg_dev -> abg_dev (forced update)
 + 343065c...dcd353e colorbarDivBroken -> colorbarDivBroken (forced update)
 + 672b4aa...f8436e2 master -> master (forced update)
 + 433ccb5...5039230 v1.0 -> v1.0 (forced update)
 ! [remote rejected] refs/pull/1/head -> refs/pull/1/head (deny updating a hidden ref)
 ! [remote rejected] refs/pull/15/head -> refs/pull/15/head (deny updating a hidden ref)
 ! [remote rejected] refs/pull/22/head -> refs/pull/22/head (deny updating a hidden ref)
 ! [remote rejected] refs/pull/25/head -> refs/pull/25/head (deny updating a hidden ref)
 ! [remote rejected] refs/pull/26/head -> refs/pull/26/head (deny updating a hidden ref)
 ! [remote rejected] refs/pull/30/head -> refs/pull/30/head (deny updating a hidden ref)
error: failed to push some refs to 'https://github.com/ageller/Firefly.git'
```

9. There are some errors here, but according to the bfg issues, this is OK.  These are from pull requests that can't be updated in this way.  [See here.](https://github.com/rtyley/bfg-repo-cleaner/issues/36)


