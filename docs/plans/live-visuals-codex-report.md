# Live visuals: Codex lane report

## Batch 1

- `ActivationFunctionsDiagram`: The highlight moves across activation families because a learner needs to compare how each real function transforms the same input range.
- `ClipDualEncoderDiagram`: Image and text signals move into the shared space together because CLIP encodes both modalities in parallel before comparing their embeddings.
- `MessagePassingDiagram`: Messages move outward hop by hop because a graph node aggregates information from increasingly distant neighbours at each GNN layer.
- `RLNetworkFamilyDiagram`: The selected method advances through the RL network family because the diagram compares how successive architectures assign value and policy work.
- `SiameseTripletDiagram`: The embedding arrangement alternates before and after training because triplet loss pulls the positive toward the anchor while pushing the negative away.
- `SslMethodsDiagram`: The view alternates between contrastive and masked prediction because self-supervised learning can construct its training signal through either paired views or hidden content.
- `TcnDilatedConvDiagram`: The active dilation layer advances because each temporal convolution layer reaches farther into the causal history.
- `CausalMaskAnimated`: The matrix progresses from scores to masking to softmax because causal attention must block future positions before normalizing its weights.
- `AutoencoderDiagram`: Samples move through the encoder bottleneck and decoder while the mode alternates because autoencoders compress and reconstruct data, with VAEs replacing a point bottleneck by a sampled distribution.
- `BertInputRepresentationDiagram`: The active token column advances because BERT forms every input position by adding its token, segment, and position embeddings.
- `CnnArchitectureLineageDiagram`: The highlighted architecture advances through the lineage because each CNN family introduces a response to a limitation in the preceding designs.
- `CnnVsVitDiagram`: The view alternates between CNN and ViT connectivity because local convolution and global self-attention give patches different first-layer communication ranges.
- `ConvolutionOperationDiagram`: The kernel window moves across the image because convolution reuses the same filter at every spatial position.
- `DepthwiseSeparableConvDiagram`: The comparison alternates between standard and separable convolution because factorizing spatial filtering from channel mixing changes the computation while preserving the output shape.
- `PoolingOperationDiagram`: The active pooling window advances across the four quadrants because max pooling reduces each local region to its largest value.
- `ReceptiveFieldGrowthDiagram`: The highlighted receptive field expands layer by layer because stacked convolutions let one output depend on a wider input region.
- `ResNetSkipConnectionDiagram`: Activations travel through the transform and shortcut paths together because a residual block adds the identity input to the learned residual.
- `CatastrophicForgettingDiagram`: A cursor advances across sequential training because the performance gap appears as the model moves from one task phase to the next.
- `DiffusionForwardProcessDiagram`: The timestep advances from clean signal toward noise because the forward diffusion process adds noise progressively according to its schedule.
- `GanMinimaxDiagram`: Training progress advances as the generated distribution approaches the real one because the generator and discriminator improve through their minimax game.

## Batch 2

- `LrSchedulesDiagram`: Left static because it is a reference chart that overlays fixed learning-rate schedules for direct shape comparison.
- `LinearAttentionFactorizationDiagram`: Left static because it is a reference comparison of two multiplication orders and no value changes or travels in the shown matrix-shape argument.
- `RegressionLossesDiagram`: Left static because it is a reference chart whose purpose is simultaneous comparison of five fixed loss curves.
- `AttentionLayersCatalogDiagram`: The selected layer advances because the catalog compares the distinct computation performed by each attention-family building block.
- `ConvolutionalLayersCatalogDiagram`: The selected layer advances because the catalog compares which axes each convolutional layer operates on.
- `CoreBuildingBlocksDiagram`: The selected building block advances because dense, embedding, and flatten layers perform different tensor transformations.
- `NormalizationAxisDiagram`: The highlighted cells change with the selected method because each normalization family computes statistics over a different tensor axis.
- `RecurrentLayersCatalogDiagram`: The selected recurrent cell advances because RNN, LSTM, and GRU introduce successively different state-update mechanisms.
- `TransposedConvUpsampleDiagram`: Left static because it is a reference shape comparison between the fixed 2×2 input and 4×4 learned output.
- `BidirectionalRnnDiagram`: The active token advances because forward and backward recurrent states meet at every sequence position.
- `GruCellDiagram`: The active gate alternates because the reset and update gates control different stages of the GRU state update.
- `LstmCellDiagram`: The active gate advances because forget, input, candidate, and output gates act in sequence to update and expose the cell state.
- `RnnUnrolledDiagram`: The active cell advances one timestep at a time because an RNN reuses the same state-update computation across the sequence.
- `Seq2SeqAttentionDiagram`: The active decoder token advances because attention recomputes a new alignment over encoder states for every output step.
- `Seq2SeqDiagram`: The context vector pulses between normal and emphasized states because the whole encoded sequence must pass through that single bottleneck before decoding.
- `VanishingGradientDiagram`: The traced distance and recurrent weight advance because repeated Jacobian multiplication makes gradients decay or grow across timesteps.
- `LrScheduleDiagram`: Left static because it is a reference schedule plot whose fixed curve is intended for exact reading rather than process playback.
- `DetrSetPredictionDiagram`: Left static because the four learned queries are parallel set members, and animating them sequentially would incorrectly imply ordered prediction.
- `SemanticVsInstanceSegmentationDiagram`: The view alternates because semantic segmentation merges same-class pixels while instance segmentation keeps individual objects separate.
- `SwinWindowAttentionDiagram`: The windows alternate between regular and shifted layouts because Swin connects neighbouring windows by shifting the partition on the next block.
- `TwoStageVsOneStageDetectionDiagram`: The view alternates because two-stage detectors propose then classify regions while one-stage detectors predict boxes and classes directly.
- `UNetArchitectureDiagram`: Skip connections appear and disappear because U-Net preserves fine spatial detail by carrying encoder features directly to matching decoder stages.
- `ViTVariantsDiagram`: The highlighted variant advances because each Vision Transformer family changes its tokenization or attention locality.
- `ContinuousBatchingDiagram`: The occupancy view alternates because continuous batching replaces finished requests immediately while static batching leaves slots idle.
- `JudgePositionBiasDiagram`: The response order swaps because an LLM judge's first-position bias can reverse its verdict without changing response quality.
- `PagedAttentionDiagram`: The allocation view alternates because paged KV caches use non-contiguous on-demand blocks instead of contiguous over-reservation.
- `SpeculativeDecodingDiagram`: Draft tokens alternate between proposed and verified states because the target model accepts a matching prefix and rejects the remainder in one pass.
